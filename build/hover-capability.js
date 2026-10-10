import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

// Touch browsers may retain :hover after release. Gate real hover pseudos across
// both the app and imported GlassKit, without changing selection or focus rules.
export function hoverCapability() {
  return {
    postcssPlugin: 'bitify-hover-capability',
    OnceExit(root) {
      const rules = [];
      root.walkRules(rule => rules.push(rule));
      for (const rule of rules) {
        if (!rule.selector.includes(':hover')) continue;
        const selectors = selectorParser().astSync(rule.selector);
        let hasHover = false;
        selectors.walkPseudos(node => { if (node.value === ':hover') hasHover = true; });
        if (!hasHover) continue; // Attribute values/text are not interaction states.
        const hovered = rule.clone();
        // A top-level hover requirement has no touch fallback. Mixed functional
        // selectors and comma alternatives retain their active/focus branches.
        for (const selector of [...selectors.nodes]) {
          if (selector.nodes.some(node => node.type === 'pseudo' && node.value === ':hover')) selector.remove();
        }
        selectors.walkPseudos(node => {
          if (node.value === ':hover') {
            // An impossible pseudo retains :hover's specificity in :is/:not/etc.
            node.replaceWith(selectorParser().astSync(':nth-child(0)').first.first.clone());
          }
        });
        const gate = postcss.atRule({ name: 'media', params: '(hover: hover)' });
        gate.append(hovered);
        if (selectors.nodes.length) {
          const touch = postcss.atRule({ name: 'media', params: '(hover: none)' });
          touch.append(rule.clone({ selector: selectors.toString() }));
          rule.replaceWith(touch, gate);
        } else rule.replaceWith(gate);
      }
    },
  };
}
