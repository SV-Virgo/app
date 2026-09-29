const { withAndroidManifest } = require('expo/config-plugins');

// Makes the Android app phone-only on Google Play: <compatible-screens>
// lists only the small and normal screen sizes (every phone), so Play
// filters the app out for tablets (large / xlarge screens) automatically —
// no device-catalog exclusions needed. iOS is handled separately with
// ios.supportsTablet: false in app.json.
// See https://developer.android.com/guide/topics/manifest/compatible-screens-element
const SIZES = ['small', 'normal'];
const DENSITIES = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', '280', '360', '420', '480', '560', '640'];

module.exports = function withPhoneOnly(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['compatible-screens'] = [
      {
        screen: SIZES.flatMap((size) =>
          DENSITIES.map((density) => ({ $: { 'android:screenSize': size, 'android:screenDensity': density } })),
        ),
      },
    ];
    return cfg;
  });
};
