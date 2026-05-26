/* MySpace AI Bridge — Color Patch
   Substitui MySpace_addConnection para aceitar cor como 4º parâmetro.
   Adicione este arquivo DEPOIS do script principal do index.html:
     <script src="./ai-bridge-color-patch.js"></script>
   (antes do </body>) */
(function () {
  'use strict';

  function aiSave() {
    try {
      if (typeof saveHist   === 'function') saveHist();
      if (typeof draw       === 'function') draw();
      if (typeof triggerSave === 'function') triggerSave();
      if (window.MySpace && typeof window.MySpace.saveNow === 'function') {
        window.MySpace.saveNow().catch(function () {});
      }
    } catch (e) {}
  }

  /* Sobrescreve a função original adicionando suporte ao parâmetro color */
  window.MySpace_addConnection = function (from, to, style, color) {
    try {
      connections.push({
        id: 'ac_' + Date.now(),
        from: from,
        to: to,
        style: style || 'curved',
        width: 2,
        color: color || 'default',
        opacity: 1
      });
      aiSave();
      return true;
    } catch (e) {
      console.warn('[AI Bridge] addConnection error:', e);
      return false;
    }
  };

})();
