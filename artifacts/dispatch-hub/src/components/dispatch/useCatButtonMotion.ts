import { useEffect } from 'react';
import type { Theme } from './themeModel';

/** Decorative native-click feedback; never intercept or replay the button's action. */
export function useCatButtonMotion(theme: Theme) {
  useEffect(() => {
    if (theme !== 'cat') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    const cancelAll = () => {
      for (const animation of animations.values()) animation.cancel();
      animations.clear();
    };
    const animateClick = (event: MouseEvent) => {
      if (reducedMotion.matches || !(event.target instanceof Element)) return;
      const button = event.target.closest('button, [role="button"], [data-dispatch-button="true"]');
      if (!(button instanceof HTMLElement) || button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true' || typeof button.animate !== 'function') return;
      animations.get(button)?.cancel();
      const transform = window.getComputedStyle(button).transform;
      const base = transform === 'none' ? '' : `${transform} `;
      const animation = button.animate([
        { transform: `${base}scale(1) rotate(0deg)`, offset: 0 },
        { transform: `${base}scale(0.95) rotate(-1.5deg)`, offset: 0.24 },
        { transform: `${base}scale(1.025) rotate(0.7deg)`, offset: 0.6 },
        { transform: `${base}scale(1) rotate(0deg)`, offset: 1 },
      ], { duration: 360, easing: 'cubic-bezier(.2,.75,.3,1)' });
      animations.set(button, animation);
      void animation.finished.catch(() => undefined).finally(() => {
        if (animations.get(button) === animation) animations.delete(button);
      });
    };
    document.addEventListener('click', animateClick, true);
    reducedMotion.addEventListener('change', cancelAll);
    return () => {
      document.removeEventListener('click', animateClick, true);
      reducedMotion.removeEventListener('change', cancelAll);
      cancelAll();
    };
  }, [theme]);
}
