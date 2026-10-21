/**
 * Automatically imports all JS files in src/effects using Vite's glob import.
 * Filters out abstract base classes and registers concrete effects.
 */
export async function loadEffectsDynamically() {
  const modules = import.meta.glob('./*.js', { eager: true });
  const registeredEffects = [];

  for (const path in modules) {
    const module = modules[path];

    for (const exportKey in module) {
      const EffectClass = module[exportKey];

      // Only load classes that explicitly define their own 'id' and 'label'
      // and are NOT marked abstract on their OWN constructor
      const isConcrete = 
        typeof EffectClass === 'function' &&
        EffectClass.id && 
        EffectClass.label &&
        !Object.prototype.hasOwnProperty.call(EffectClass, 'isAbstract');

      if (isConcrete) {
        registeredEffects.push(EffectClass);
      }
    }
  }

  // Sort effects alphabetically by label
  registeredEffects.sort((a, b) => a.label.localeCompare(b.label));

  return registeredEffects;
}
