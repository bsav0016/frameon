/**
 * Guards the permissions the Android release asks for. FrameOn only handles photos: it never records audio and
 * never draws over other apps, but a library (or an old line in app.json) can add those permissions to the
 * merged manifest, and Google Play asks about every permission a release requests. If one is needed on purpose,
 * remove it here and from the Play Console data safety answers together.
 */
const android = require('../app.json').expo.android;

describe('Android permissions', () => {
  test('does not request the microphone by hand', () => {
    expect(android.permissions ?? []).not.toContain('android.permission.RECORD_AUDIO');
  });

  test.each(['android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW'])(
    'blocks %s, which libraries would otherwise add',
    (permission) => {
      expect(android.blockedPermissions).toContain(permission);
    },
  );

  test('keeps the camera, which taking a photo of artwork needs', () => {
    expect(android.blockedPermissions).not.toContain('android.permission.CAMERA');
  });
});
