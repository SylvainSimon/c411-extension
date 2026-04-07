import Twig from 'twig';

/**
 * Moteur de template utilisant Twig.js
 */
export const TemplateEngine = {
  /**
   * Rend un template avec les données fournies
   * @param template - Le contenu brut du template (string)
   * @param data - Les données à injecter
   */
  render(template: string, data: Record<string, any>): string {
    const compiled = Twig.twig({
      data: template
    });
    
    return compiled.render(data);
  }
};
