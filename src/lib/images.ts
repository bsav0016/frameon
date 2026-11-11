import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type ImageSource = 'camera' | 'library';

/** Returns a local uri, or null if the user cancelled. Throws a user-readable Error if permission is denied. */
export async function pickImage(source: ImageSource, aspect?: [number, number]): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera access is off. Enable it in Settings to take a photo.');
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo access is off. Enable it in Settings to choose a photo.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: !!aspect, aspect };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0].uri;
}

/** Downsizes and re-encodes as JPEG so uploads stay well under the Storage rule limits (5 MB posts, 2 MB avatars). */
export async function prepareImage(uri: string, maxWidth: number): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}
