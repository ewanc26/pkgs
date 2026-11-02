import { json, error, type RequestHandler } from '@sveltejs/kit';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const input = formData.get('input');
  const site = (formData.get('site') as string) || '';
  const includePrivate = formData.get('include-private') === 'true';

  if (!input || !(input instanceof File)) {
    throw error(400, { message: 'No file uploaded' });
  }

  if (!site) {
    throw error(400, { message: 'Site URL is required' });
  }

  let tempPath: string | null = null;
  try {
    const rockTumbl = await import('@ewanc26/rock-tumbl');
    const { parseArchive, convertArchive } = rockTumbl;

    const buffer = await input.arrayBuffer();
    tempPath = join(tmpdir(), `rock-tumbl-${Date.now()}-${input.name}`);
    await writeFile(tempPath, Buffer.from(buffer));

    const archive = await parseArchive(tempPath, { includePrivate });
    const result = convertArchive(archive.posts, { site, includePrivate });

    return json(result);
  } catch (err) {
    throw error(500, {
      message: err instanceof Error ? err.message : 'Conversion failed',
    });
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch {}
    }
  }
};