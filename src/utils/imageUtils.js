import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

// Pick an image, downscale to maxDim and export as a JPEG base64 data URI.
// Mirrors the web app's FileReader + canvas compression helper.
export async function pickAndResizeImage({ maxDim = 800, quality = 0.8 } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("no-permission");

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets || !result.assets.length) return null;

  const asset = result.assets[0];
  let width = asset.width || 0;
  let height = asset.height || 0;

  // Downscale to maxDim while preserving aspect ratio.
  let manipUri = asset.uri;
  if (width > maxDim || height > maxDim) {
    const ratio = maxDim / Math.max(width, height);
    const out = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.round(width * ratio), height: Math.round(height * ratio) } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    manipUri = out.uri;
    width = out.width;
    height = out.height;
    if (out.base64) {
      return { uri: manipUri, dataUri: `data:image/jpeg;base64,${out.base64}`, width, height };
    }
  }

  // Image wasn't resized: re-encode to base64.
  const out = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { uri: out.uri, dataUri: `data:image/jpeg;base64,${out.base64}`, width, height };
}

// Same as above, but for the camera if you ever want photo capture.
export async function takeAndResizeImage({ maxDim = 800, quality = 0.8 } = {}) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("no-permission");
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets || !result.assets.length) return null;
  const asset = result.assets[0];
  const out = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: maxDim, height: maxDim } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { uri: out.uri, dataUri: `data:image/jpeg;base64,${out.base64}`, width: out.width, height: out.height };
}

export function compactDataUri(dataUri, size = 120) {
  return `${dataUri}`;
}