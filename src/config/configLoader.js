/**
 * Loads default parameter JSON configs dynamically from the /src/config/ folder.
 * Matches effect IDs to JSON filenames (e.g., 'electric-bolt' -> '/src/config/electric-bolt.json').
 */
export async function loadEffectConfigs() {
  const configModules = import.meta.glob('./*.json', { eager: true });
  const configMap = new Map();

  for (const path in configModules) {
    const configData = configModules[path].default || configModules[path];
    const filename = path.replace(/^.*[\\/]/, '').replace(/\.json$/, '');
    configMap.set(filename, configData);
  }

  return configMap;
}
