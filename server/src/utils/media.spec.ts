import { stripThumbnailHeuristics } from 'src/utils/media';
import { describe, expect, it } from 'vitest';

const baseCommand = {
  inputOptions: ['-skip_frame nointra', '-sws_flags accurate_rnd+full_chroma_int'],
  outputOptions: [
    '-fps_mode vfr',
    '-frames:v 1',
    '-update 1',
    '-v verbose',
    String.raw`-vf fps=12:start_time=0:eof_action=pass:round=down,thumbnail=12,select=gt(scene\,0.1)-eq(prev_selected_n\,n)+isnan(prev_selected_n)+gt(n\,20),trim=end_frame=2,reverse,scale=-2:250:flags=lanczos+accurate_rnd+full_chroma_int:out_range=pc`,
  ],
  twoPass: false,
  progress: { frameCount: 0, percentInterval: 5 },
};

describe('stripThumbnailHeuristics', () => {
  it('strips fps/thumbnail/select/trim/reverse but keeps scale', () => {
    const result = stripThumbnailHeuristics(baseCommand);
    expect(result).not.toBeNull();
    expect(result!.outputOptions).toEqual([
      '-fps_mode vfr',
      '-frames:v 1',
      '-update 1',
      '-v verbose',
      '-vf scale=-2:250:flags=lanczos+accurate_rnd+full_chroma_int:out_range=pc',
    ]);
    expect(result!.inputOptions).toEqual(baseCommand.inputOptions);
  });

  it('keeps tonemapx in the simplified chain', () => {
    const tonemapped = {
      ...baseCommand,
      outputOptions: [
        '-fps_mode vfr',
        '-frames:v 1',
        '-update 1',
        '-v verbose',
        String.raw`-vf fps=12:start_time=0:eof_action=pass:round=down,thumbnail=12,select=gt(scene\,0.1)-eq(prev_selected_n\,n)+isnan(prev_selected_n)+gt(n\,20),trim=end_frame=2,reverse,tonemapx=tonemap=hable:desat=0:p=bt709:t=bt709:m=bt709:r=pc:peak=100:format=yuv420p`,
      ],
    };
    const result = stripThumbnailHeuristics(tonemapped);
    expect(result).not.toBeNull();
    expect(result!.outputOptions.at(-1)).toBe(
      '-vf tonemapx=tonemap=hable:desat=0:p=bt709:t=bt709:m=bt709:r=pc:peak=100:format=yuv420p',
    );
  });

  it('returns null when there is nothing to simplify', () => {
    const noFilters = { ...baseCommand, outputOptions: ['-fps_mode vfr', '-frames:v 1'] };
    expect(stripThumbnailHeuristics(noFilters)).toBeNull();
  });

  it('drops the -vf entry entirely if every filter is heuristic', () => {
    const onlyHeuristic = {
      ...baseCommand,
      outputOptions: ['-fps_mode vfr', '-vf fps=12,thumbnail=12,trim=end_frame=2,reverse'],
    };
    const result = stripThumbnailHeuristics(onlyHeuristic);
    expect(result).not.toBeNull();
    expect(result!.outputOptions).toEqual(['-fps_mode vfr']);
  });
});
