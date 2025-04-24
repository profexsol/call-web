import { useEffect, useState } from "react";

function useTFLite(segmentationConfig) {
  const [tflite, setTFLite] = useState(null);
  const [tfliteSIMD, setTFLiteSIMD] = useState(null);
  const [selectedTFLite, setSelectedTFLite] = useState(null);
  const [isSIMDSupported, setSIMDSupported] = useState(false);

  useEffect(() => {
    if(!segmentationConfig.model) return;

    async function loadTFLite() {
      // eslint-disable-next-line no-undef
      createTFLiteModule().then(setTFLite);
      try {
        // eslint-disable-next-line no-undef
        const createdTFLiteSIMD = await createTFLiteSIMDModule();
        setTFLiteSIMD(createdTFLiteSIMD);
        setSIMDSupported(true);
      } catch (error) {
        console.warn("Failed to create TFLite SIMD WebAssembly module.", error);
      }
    }

    loadTFLite();
  }, []);

  useEffect(() => {
    if(!segmentationConfig.model) return;

    async function loadTFLiteModel() {
      if (
        !tflite ||
        (isSIMDSupported && !tfliteSIMD) ||
        (!isSIMDSupported && segmentationConfig.backend === "wasmSimd") ||
        segmentationConfig.model !== "meet"
      ) {
        return;
      }

      setSelectedTFLite(undefined);

      const newSelectedTFLite =
        segmentationConfig.backend === "wasmSimd" ? tfliteSIMD : tflite;

      if (!newSelectedTFLite) {
        throw new Error(
          `TFLite backend unavailable: ${segmentationConfig.backend}`
        );
      }

      const modelFileName = "segm_full_v679";
      console.log("Loading tflite model:", modelFileName);
      console.log(
        "Model file path:",
        `/tflite/models/${modelFileName}.tflite`
      );
      const modelResponse = await fetch(
        `/tflite/models/${modelFileName}.tflite`
      );
      const model = await modelResponse.arrayBuffer();
      console.log("Model buffer size:", model.byteLength);

      const modelBufferOffset = newSelectedTFLite._getModelBufferMemoryOffset();
      console.log("Model buffer memory offset:", modelBufferOffset);
      console.log("Loading model buffer...");
      newSelectedTFLite.HEAPU8.set(new Uint8Array(model), modelBufferOffset);
      console.log(
        "_loadModel result:",
        newSelectedTFLite._loadModel(model.byteLength)
      );

      console.log(
        "Input memory offset:",
        newSelectedTFLite._getInputMemoryOffset()
      );
      console.log("Input height:", newSelectedTFLite._getInputHeight());
      console.log("Input width:", newSelectedTFLite._getInputWidth());
      console.log("Input channels:", newSelectedTFLite._getInputChannelCount());

      console.log(
        "Output memory offset:",
        newSelectedTFLite._getOutputMemoryOffset()
      );
      console.log("Output height:", newSelectedTFLite._getOutputHeight());
      console.log("Output width:", newSelectedTFLite._getOutputWidth());
      console.log(
        "Output channels:",
        newSelectedTFLite._getOutputChannelCount()
      );

      setSelectedTFLite(newSelectedTFLite);
    }

    loadTFLiteModel();
  }, [
    tflite,
    tfliteSIMD,
    isSIMDSupported,
    segmentationConfig.model,
    segmentationConfig.backend,
    segmentationConfig.inputResolution,
  ]);

  return { tflite: selectedTFLite, isSIMDSupported };
}

export default useTFLite;
