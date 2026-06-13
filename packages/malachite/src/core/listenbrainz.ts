import type { ListenBrainzRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';

/**
 * Convert a ListenBrainz record to an ATProto play record.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertListenBrainzToPlayRecord(r: ListenBrainzRecord, clientAgent: string): PlayRecord {
    // Seems that all listens mainly use mbid_mapping. Someone should update the official docs!
    const { recording_mbid: recordingMbId, release_mbid: releaseMbId, artists: _artists } = r.track_metadata.mbid_mapping!;
    const { track_name: trackName, release_name: releaseName } = r.track_metadata;
    const { music_service, origin_url } = r.track_metadata.additional_info!;

    const artists: PlayRecord['artists'] =
        _artists!.map( a => ({ artistName: a.artist_credit_name, artistMbid: a.artist_mbid }) );

    const record: PlayRecord = {
        $type: RECORD_TYPE,
        artists, trackName, releaseName,
        playedTime: new Date(r.listened_at).toISOString(),
        submissionClientAgent: clientAgent,
        musicServiceBaseDomain: music_service || 'local',
        originUrl: origin_url || '',
        recordingMbId, releaseMbId
    };

    return record;
}
