export const inputResolutions = {
  "640x360": [640, 360],
  "256x256": [256, 256],
  "256x144": [256, 144],
  "160x96": [160, 96],
};

export function getTFLiteModelFileName(model, inputResolution) {
  return inputResolution === "256x144" ? "segm_full_v679" : "segm_lite_v681";
}
