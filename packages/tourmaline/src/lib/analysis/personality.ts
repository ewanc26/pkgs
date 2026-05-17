import type { ListenerProfile } from "$lib/types";
import { calculateGini } from "./diversity";

export interface PersonalityTrait {
  label: string;
  value: string;
  detail: string;
}

export interface PersonalityProfile {
  archetype: string;
  archetypeBlurb: string;
  traits: PersonalityTrait[];
  summary: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return the key with the highest value in a record. */
function topKey(record: Record<string, number>): string | null {
  let best: string | null = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(record)) {
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

/** Return the top N keys sorted by value descending. */
function topKeys(record: Record<string, number>, n: number): string[] {
  return Object.entries(record)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([k]) => k);
}

/** Peak hour bucket → human label. */
function peakHourLabel(hour: number): string {
  if (hour >= 5 && hour < 9) return "an early riser";
  if (hour >= 9 && hour < 12) return "a morning listener";
  if (hour >= 12 && hour < 17) return "an afternoon listener";
  if (hour >= 17 && hour < 20) return "an evening listener";
  if (hour >= 20 && hour < 23) return "a night owl";
  return "a late-night listener";
}

function peakHourDetail(hour: number): string {
  const suffix =
    hour >= 12 ? (hour >= 13 ? `${hour - 12}pm` : "noon") : `${hour}am`;
  return `Most active around ${suffix}`;
}

// ─── Archetype decision tree ─────────────────────────────────────────────────

type Mood =
  | "Energetic"
  | "Melancholic"
  | "Chill"
  | "Happy"
  | "Aggressive"
  | "Atmospheric"
  | "Nostalgic"
  | "Dark";

interface Archetype {
  name: string;
  blurb: string;
}

const ARCHETYPES: Record<string, Record<string, Archetype>> = {
  Metal: {
    Aggressive: {
      name: "Void Pilgrim",
      blurb:
        "Chases the heaviest corners of the spectrum, drawn to darkness and raw force.",
    },
    Dark: {
      name: "Iron Cultist",
      blurb: "Finds meaning in the heaviest, most uncompromising sounds.",
    },
    Atmospheric: {
      name: "Cathedral Dweller",
      blurb: "Drawn to the grand and the cavernous — metal as architecture.",
    },
    Energetic: {
      name: "Riff Chaser",
      blurb: "Runs on adrenaline and dropped tunings.",
    },
    _default: {
      name: "Heavy Listener",
      blurb: "At home in the loud and the unsubtle.",
    },
  },
  Rock: {
    Energetic: {
      name: "Voltage Chaser",
      blurb: "Lives for the moment a song kicks in and refuses to let go.",
    },
    Nostalgic: {
      name: "Riff Archaeologist",
      blurb: "Treats guitar music as living history worth preserving.",
    },
    Atmospheric: {
      name: "Static Dreamer",
      blurb: "Drawn to the hazy, textured side of guitar music.",
    },
    Melancholic: {
      name: "Quiet Signal",
      blurb: "Finds the bruised emotional core inside loud music.",
    },
    _default: {
      name: "Six-String Wanderer",
      blurb:
        "Covers a lot of ground without straying too far from the fretboard.",
    },
  },
  Electronic: {
    Energetic: {
      name: "Signal Hunter",
      blurb: "Tracks down the harder, faster, louder edges of club music.",
    },
    Chill: {
      name: "Frequency Drifter",
      blurb: "Comfortable in the slow, textured spaces between beats.",
    },
    Atmospheric: {
      name: "Grid Architect",
      blurb: "Interested in sound as environment rather than performance.",
    },
    Nostalgic: {
      name: "Waveform Archaeologist",
      blurb: "Catalogues the sounds of imaginary futures that never happened.",
    },
    Aggressive: {
      name: "Noise Merchant",
      blurb: "Thrives on the abrasive and the overwhelming.",
    },
    _default: {
      name: "Grid Traveller",
      blurb: "Covers the electronic map without a fixed destination.",
    },
  },
  "Hip Hop": {
    Aggressive: {
      name: "Cipher Keeper",
      blurb:
        "Gravitates to the confrontational, technical, and uncompromising.",
    },
    Chill: {
      name: "Lo-Fi Cartographer",
      blurb: "Drawn to the blunted, dusty, introspective end of rap.",
    },
    Nostalgic: {
      name: "Crate Pilgrim",
      blurb:
        "Finds the good stuff in the past and won't stop talking about it.",
    },
    Energetic: {
      name: "Flow Seeker",
      blurb:
        "Here for the velocity — cadence, rhythm, and relentless forward motion.",
    },
    _default: {
      name: "Verse Wanderer",
      blurb:
        "Roams widely across hip hop without planting a flag anywhere in particular.",
    },
  },
  Jazz: {
    Chill: {
      name: "Midnight Librarian",
      blurb:
        "Most at home when the room is quiet and the music fills the gaps.",
    },
    Atmospheric: {
      name: "Blue Note Keeper",
      blurb: "Treats jazz as atmosphere first, architecture second.",
    },
    Energetic: {
      name: "Bebop Navigator",
      blurb: "Chases the complex, the fast, and the technically overwhelming.",
    },
    Nostalgic: {
      name: "Standard Bearer",
      blurb:
        "Has a deep and probably opinionated relationship with jazz history.",
    },
    _default: {
      name: "Chord Wanderer",
      blurb: "Moves through jazz with an open ear and no fixed address.",
    },
  },
  Classical: {
    Atmospheric: {
      name: "Score Dreamer",
      blurb:
        "Classical music as immersive experience — texture over narrative.",
    },
    Nostalgic: {
      name: "Timbre Archivist",
      blurb: "Custodian of centuries of orchestral grammar.",
    },
    Melancholic: {
      name: "Quiet Formalist",
      blurb: "Finds the emotional weight in structure and restraint.",
    },
    _default: {
      name: "Quiet Architect",
      blurb: "Appreciates the long form and the slow development.",
    },
  },
  Folk: {
    Nostalgic: {
      name: "Ballad Keeper",
      blurb:
        "Drawn to songs that sound like they've been around longer than recorded time.",
    },
    Melancholic: {
      name: "Acoustic Recluse",
      blurb: "Finds the bruised and intimate side of folk the most honest.",
    },
    Energetic: {
      name: "Road Song Pilgrim",
      blurb: "Chases the rowdy, kinetic corner of folk and its neighbours.",
    },
    _default: {
      name: "Acoustic Wanderer",
      blurb: "Comfortable anywhere there's a voice and a guitar.",
    },
  },
  Pop: {
    Happy: {
      name: "Chorus Chaser",
      blurb: "Fully committed to the hook and not embarrassed about it.",
    },
    Energetic: {
      name: "Hook Hunter",
      blurb:
        "Here for the moment a song locks in and refuses to leave your head.",
    },
    Melancholic: {
      name: "Sad Banger Collector",
      blurb: "Finds the devastating thing inside the catchy thing.",
    },
    Nostalgic: {
      name: "Pop Archaeologist",
      blurb:
        "Catalogues what the charts used to sound like with quiet affection.",
    },
    _default: {
      name: "Melody Keeper",
      blurb: "Follows the tune wherever it leads.",
    },
  },
  "R&B": {
    Chill: {
      name: "Groove Architect",
      blurb: "Builds the mood from the rhythm up — unhurried and deliberate.",
    },
    Happy: {
      name: "Rhythm Keeper",
      blurb: "In it for the feel-good and unashamed to say so.",
    },
    Nostalgic: {
      name: "Soul Cartographer",
      blurb:
        "Maps the emotional terrain of rhythm and blues from Motown outward.",
    },
    Melancholic: {
      name: "Late Night Signal",
      blurb: "Finds the ache inside the smoothness.",
    },
    _default: {
      name: "Groove Seeker",
      blurb: "Drawn to the places where rhythm and feeling meet.",
    },
  },
  Country: {
    Nostalgic: {
      name: "Backroad Pilgrim",
      blurb:
        "Invested in the places country music comes from and the stories it carries.",
    },
    Energetic: {
      name: "Honky Tonk Ranger",
      blurb: "Here for the loud, the rowdy, and the danceable.",
    },
    Melancholic: {
      name: "Porch Light Listener",
      blurb: "Finds the sadness in country music and sits with it comfortably.",
    },
    _default: {
      name: "Open Road Listener",
      blurb: "Follows country wherever it leads without much map-reading.",
    },
  },
  Blues: {
    Melancholic: {
      name: "Delta Wanderer",
      blurb:
        "Understands that the blues is not just a genre but a disposition.",
    },
    Dark: {
      name: "Twelve-Bar Pilgrim",
      blurb: "Finds the grim and unvarnished side of blues the most truthful.",
    },
    Energetic: {
      name: "Chicago Chaser",
      blurb: "Drawn to the electric, amplified, city-noise end of the blues.",
    },
    _default: {
      name: "Twelve-Bar Keeper",
      blurb: "At ease in the oldest and most honest genre on the list.",
    },
  },
  World: {
    Atmospheric: {
      name: "Sonic Cartographer",
      blurb:
        "Treats the map of global music as a territory worth exploring systematically.",
    },
    Nostalgic: {
      name: "Global Archivist",
      blurb: "Collects music the way a geographer collects coordinates.",
    },
    _default: {
      name: "Global Ear",
      blurb: "Refuses to limit their listening to any one cultural tradition.",
    },
  },
  Reggae: {
    Chill: {
      name: "Roots Wanderer",
      blurb: "Drawn to the unhurried, sun-warmed end of the reggae spectrum.",
    },
    _default: {
      name: "Riddim Keeper",
      blurb: "Knows that the rhythm is the thing.",
    },
  },
  Latin: {
    Energetic: {
      name: "Rhythm Pilgrim",
      blurb:
        "Follows the beat wherever it leads, regardless of language or postcode.",
    },
    Happy: {
      name: "Cadence Keeper",
      blurb: "In it for the joy and the movement.",
    },
    _default: {
      name: "Latitude Listener",
      blurb: "Covers the Latin diaspora without a fixed destination.",
    },
  },
  Punk: {
    Aggressive: {
      name: "Loud Devotee",
      blurb: "Punk as a stance, not just a genre.",
    },
    Energetic: {
      name: "Three-Chord Chaser",
      blurb: "Appreciates the efficiency of saying it fast and getting out.",
    },
    _default: {
      name: "Noise Keeper",
      blurb: "Not interested in the polished version of anything.",
    },
  },
  Soundtrack: {
    Atmospheric: {
      name: "Cinematic Listener",
      blurb: "Prefers music with a picture attached, real or imagined.",
    },
    Nostalgic: {
      name: "Score Collector",
      blurb:
        "Catalogues the sounds of films and games with genuine investment.",
    },
    _default: {
      name: "Scene Reader",
      blurb: "Lets the music do the world-building.",
    },
  },
  "Singer-Songwriter": {
    Melancholic: {
      name: "Quiet Observer",
      blurb: "Gravitates to music that sounds like someone telling the truth.",
    },
    Nostalgic: {
      name: "Verse Keeper",
      blurb: "Drawn to the lyric first, the music second.",
    },
    _default: {
      name: "Lyric Wanderer",
      blurb: "Follows the voice and the word wherever they lead.",
    },
  },
  "New Age": {
    Chill: {
      name: "Ambient Drifter",
      blurb: "Comfortable in music that asks nothing of you.",
    },
    Atmospheric: {
      name: "Texture Collector",
      blurb:
        "Treats music as environment — something to inhabit rather than consume.",
    },
    _default: {
      name: "Quiet Mind",
      blurb: "Prefers music that makes space rather than filling it.",
    },
  },
};

// Special overrides that supersede the genre/mood tree
function checkOverrides(profile: ListenerProfile): Archetype | null {
  if (profile.diversityScore >= 88) {
    return {
      name: "Sonic Omnivore",
      blurb:
        "Refuses to be categorised — because the data refuses too. Listens to everything with equal enthusiasm.",
    };
  }
  if (profile.diversityScore <= 18) {
    const topGenre = profile.genres[0]?.name ?? "music";
    return {
      name: "Devoted Loyalist",
      blurb: `Has found their thing — ${topGenre} — and sees no compelling reason to leave.`,
    };
  }
  return null;
}

// ─── Genre blends ──────────────────────────────────────────────────────────
// When two genres are close in weight (within 30%), blend them.
// Key is the two genres sorted alphabetically and joined with "+".

const BLENDS: Record<string, Record<string, Archetype>> = {
  "Electronic+Metal": {
    Aggressive: {
      name: "Freq Crusher",
      blurb:
        "Where industrial meets the void — synthesized aggression as a way of life.",
    },
    Atmospheric: {
      name: "Grid Walker",
      blurb:
        "Moves between electronic architecture and metal weight with equal ease.",
    },
    Energetic: {
      name: "Voltage Alchemist",
      blurb:
        "Fuses circuit and distortion into something neither genre could reach alone.",
    },
    _default: {
      name: "Circuit Breaker",
      blurb: "At home in both the digital and the distorted.",
    },
  },
  "Electronic+Pop": {
    Happy: {
      name: "Frequency Chaser",
      blurb: "Drawn to the bright intersection of synths and hooks.",
    },
    Energetic: {
      name: "Signal Pop",
      blurb: "Where the dancefloor meets the radio edit.",
    },
    Nostalgic: {
      name: "Retro Wavelength",
      blurb: "Collects the pop of imagined futures past.",
    },
    _default: {
      name: "Synth Keeper",
      blurb: "Comfortable where electronic production meets pop songwriting.",
    },
  },
  "Folk+Rock": {
    Nostalgic: {
      name: "Highway Pilgrim",
      blurb: "Finds the story in both the amplifier and the acoustic.",
    },
    Melancholic: {
      name: "Dust Wanderer",
      blurb: "Drawn to the weathered end of both folk and rock.",
    },
    Energetic: {
      name: "Campfire Voltage",
      blurb: "Turns up the volume on songs that were already loud enough.",
    },
    _default: {
      name: "Crossroad Keeper",
      blurb: "Where the riff meets the road.",
    },
  },
  "Hip Hop+R&B": {
    Chill: {
      name: "Velvet Loop",
      blurb: "Lives in the smooth, low-lit space between rap and soul.",
    },
    Energetic: {
      name: "Cadence Hunter",
      blurb: "Follows the rhythm whether it raps or croons.",
    },
    Aggressive: {
      name: "Cipher Pulse",
      blurb: "Drawn to the confrontational edge of both genres.",
    },
    _default: {
      name: "Rhythm Keeper",
      blurb: "Does not distinguish between the beat and the groove.",
    },
  },
  "Metal+Rock": {
    Aggressive: {
      name: "Iron Chaser",
      blurb: "Runs the full spectrum from heavy to heavier.",
    },
    Atmospheric: {
      name: "Cathedral Signal",
      blurb:
        "Drawn to the grand and the textured — from stoner fuzz to post-metal weight.",
    },
    Nostalgic: {
      name: "Amp Archaeologist",
      blurb: "Treats the history of loud guitar as a living archive.",
    },
    Energetic: {
      name: "Riff Runner",
      blurb: "Lives for the moment where rock ends and metal begins.",
    },
    _default: {
      name: "Amplifier Keeper",
      blurb: "Comfortable anywhere the volume goes up.",
    },
  },
  "Pop+Rock": {
    Happy: {
      name: "Chorus Pilot",
      blurb:
        "Follows the hook wherever it leads — pop structure, rock delivery.",
    },
    Energetic: {
      name: "Anthem Chaser",
      blurb: "Here for the songs that fill rooms.",
    },
    Nostalgic: {
      name: "Dial Keeper",
      blurb: "Catalogues the radio hits of every decade with quiet affection.",
    },
    _default: {
      name: "Wavelength Keeper",
      blurb: "Where the melody meets the distortion pedal.",
    },
  },
  "Rock+Soundtrack": {
    Atmospheric: {
      name: "Score Pilgrim",
      blurb:
        "Drawn to the cinematic — whether it comes from a guitar or an orchestra.",
    },
    Nostalgic: {
      name: "Scene Archaeologist",
      blurb: "Treats soundtracks and rock albums as parts of the same archive.",
    },
    _default: {
      name: "Cinematic Wanderer",
      blurb: "Where the stage meets the screen.",
    },
  },
};

function blendKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

function pickArchetype(profile: ListenerProfile): Archetype {
  const override = checkOverrides(profile);
  if (override) return override;

  const topGenre = profile.genres[0]?.name ?? "";
  const secondGenre = profile.genres[1]?.name ?? "";
  const topMood = topKey(profile.mood) as Mood | null;

  // Check for genre blend when top two genres are within 30% weight
  if (secondGenre && profile.genres.length >= 2) {
    const topWeight = profile.genres[0].weight;
    const secondWeight = profile.genres[1].weight;
    if (topWeight > 0 && secondWeight / topWeight >= 0.7) {
      const key = blendKey(topGenre, secondGenre);
      const blendMap = BLENDS[key];
      if (blendMap) {
        if (topMood && blendMap[topMood]) {
          return blendMap[topMood];
        }
        return (
          blendMap["_default"] ?? {
            name: "Open Listener",
            blurb: "Hard to pin down — which is probably the point.",
          }
        );
      }
    }
  }

  const genreMap = ARCHETYPES[topGenre];

  if (!genreMap) {
    return {
      name: "Open Listener",
      blurb: "Hard to pin down — which is probably the point.",
    };
  }

  if (topMood && genreMap[topMood]) {
    return genreMap[topMood];
  }

  return (
    genreMap["_default"] ?? {
      name: "Open Listener",
      blurb: "Hard to pin down — which is probably the point.",
    }
  );
}

// ─── Trait builders ──────────────────────────────────────────────────────────

function peakHourTrait(profile: ListenerProfile): PersonalityTrait {
  // Sum counts across all days to get hour totals
  const byHour = new Array(24).fill(0) as number[];
  for (const { hour, count } of profile.timeline) {
    byHour[hour] = (byHour[hour] ?? 0) + count;
  }
  const peak = byHour.indexOf(Math.max(...byHour));
  return {
    label: "Listening window",
    value: peakHourLabel(peak),
    detail: peakHourDetail(peak),
  };
}

function loyaltyTrait(profile: ListenerProfile): PersonalityTrait {
  if (profile.totalScrobbles === 0) {
    return {
      label: "Listener type",
      value: "Unknown",
      detail: "Not enough data",
    };
  }

  // Gini coefficient: 0 = perfectly equal, 1 = all plays to one artist
  // High Gini → deep repeater, low Gini → relentless explorer
  const gini = profile.giniCoefficient;

  let value: string;
  let detail: string;

  if (gini >= 0.75) {
    value = "Deep repeater";
    detail = `Concentrates heavily on a few artists (Gini ${gini.toFixed(2)})`;
  } else if (gini >= 0.5) {
    value = "Balanced listener";
    detail = "Revisits favourites but keeps seeking new things";
  } else if (gini >= 0.3) {
    value = "Active explorer";
    detail = "Consistently seeking out new artists";
  } else {
    value = "Relentless explorer";
    detail = "Distributes attention widely — rarely replays anything";
  }

  return { label: "Listener type", value, detail };
}

function obscurityTrait(profile: ListenerProfile): PersonalityTrait {
  const idx = profile.obscurityIndex;
  let detail: string;

  if (idx >= 80) detail = "Most artists have under 10k listeners";
  else if (idx >= 60) detail = "Skews heavily toward lesser-known acts";
  else if (idx >= 40) detail = "Mix of known and unknown artists";
  else if (idx >= 20) detail = "Mostly established, well-followed artists";
  else detail = "Listens almost exclusively to major acts";

  // Obscurity label from analysis module — replicate here to avoid circular import
  let value: string;
  if (idx >= 80) value = "Deep cuts";
  else if (idx >= 60) value = "Underground";
  else if (idx >= 40) value = "Eclectic";
  else if (idx >= 20) value = "Mainstream";
  else value = "Top 40";

  return { label: "Taste profile", value, detail };
}

function genreBreadthTrait(profile: ListenerProfile): PersonalityTrait {
  const count = profile.genres.length;
  const topThree = profile.genres
    .slice(0, 3)
    .map((g) => g.name)
    .join(", ");

  let value: string;
  let detail: string;

  if (count <= 2) {
    value = "Genre purist";
    detail = `Almost entirely: ${topThree}`;
  } else if (count <= 5) {
    value = "Focused range";
    detail = `Centred on ${topThree}`;
  } else if (count <= 9) {
    value = "Wide taste";
    detail = `Spans ${count} genres — led by ${topThree}`;
  } else {
    value = "Omnivorous";
    detail = `${count} genres represented — restless by nature`;
  }

  return { label: "Genre range", value, detail };
}

function moodTrait(profile: ListenerProfile): PersonalityTrait {
  const top2 = topKeys(profile.mood, 2);
  if (top2.length === 0) {
    return {
      label: "Mood profile",
      value: "Undefined",
      detail: "Not enough genre data to infer mood",
    };
  }

  const [first, second] = top2;
  const moodDescriptions: Record<string, string> = {
    Energetic: "driven and restless",
    Melancholic: "reflective and bittersweet",
    Chill: "measured and low-pressure",
    Happy: "bright and forward-looking",
    Aggressive: "intense and confrontational",
    Atmospheric: "immersive and texture-led",
    Nostalgic: "backwards-glancing and sentimental",
    Dark: "drawn to shadow and weight",
  };

  const value = second ? `${first} / ${second}` : first;
  const detail = moodDescriptions[first] ?? first.toLowerCase();

  return {
    label: "Emotional tone",
    value,
    detail: `Comes across as ${detail}`,
  };
}

function intensityTrait(profile: ListenerProfile): PersonalityTrait {
  if (profile.dailyScrobbles.length === 0) {
    return {
      label: "Listening intensity",
      value: "Unknown",
      detail: "Not enough data",
    };
  }

  const days = profile.dailyScrobbles.length;
  const avg = Math.round(profile.totalScrobbles / Math.max(days, 1));

  let value: string;
  let detail: string;

  if (avg >= 100) {
    value = "Constant stream";
    detail = `${avg} scrobbles/day on average — music is always on`;
  } else if (avg >= 40) {
    value = "Heavy listener";
    detail = `${avg} scrobbles/day on average`;
  } else if (avg >= 15) {
    value = "Regular listener";
    detail = `${avg} scrobbles/day on average`;
  } else {
    value = "Occasional listener";
    detail = `${avg} scrobbles/day on average`;
  }

  return { label: "Listening intensity", value, detail };
}

// ─── Summary sentence ────────────────────────────────────────────────────────

function buildSummary(profile: ListenerProfile, archetype: Archetype): string {
  const topGenre = profile.genres[0]?.name ?? "music";
  const topMood = topKey(profile.mood);
  const obscurity = profile.obscurityIndex;
  const diversity = profile.diversityScore;

  const obscurityPhrase =
    obscurity >= 70
      ? "leans toward the obscure"
      : obscurity >= 45
        ? "splits evenly between known and unknown"
        : "follows well-trodden paths";

  const diversityPhrase =
    diversity >= 75
      ? "casts a wide net"
      : diversity >= 45
        ? "has a clear centre of gravity"
        : "goes deep on a narrow range";

  const moodPhrase = topMood
    ? `with a listening mood that runs ${topMood.toLowerCase()}`
    : "";

  return (
    `Primarily rooted in ${topGenre}${moodPhrase ? " " + moodPhrase : ""}, ` +
    `this listener ${diversityPhrase} and ${obscurityPhrase}. ` +
    `${archetype.blurb}`
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function buildPersonality(profile: ListenerProfile): PersonalityProfile {
  const archetype = pickArchetype(profile);
  const summary = buildSummary(profile, archetype);

  const traits: PersonalityTrait[] = [
    peakHourTrait(profile),
    loyaltyTrait(profile),
    obscurityTrait(profile),
    genreBreadthTrait(profile),
    moodTrait(profile),
    intensityTrait(profile),
  ];

  return {
    archetype: archetype.name,
    archetypeBlurb: archetype.blurb,
    traits,
    summary,
  };
}
