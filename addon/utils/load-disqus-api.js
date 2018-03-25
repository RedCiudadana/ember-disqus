import DisqusCache from 'ember-disqus/utils/disqus-cache';
import Ember from 'ember';
import defaultFor from 'ember-disqus/utils/default-for';

const { getOwner } = Ember;

export default function loadDisqusApi(context, fileName) {
  const owner = getOwner(context),
    ENV = owner.resolveRegistration('config:environment');

  let documentIsReady, filePath, cachedValue, shortname, shouldLazyLoad;

  function tryCallback(retrievedFromCache) {
    if (Ember.typeOf(context.disqusCallback) === 'function') {
      context.disqusCallback(retrievedFromCache); // Ensure context
    }
  }

  Ember.assert('You must set a disqus.shortname option in your config/environment module', ENV.disqus && ENV.disqus.shortname);

  shortname = ENV.disqus.shortname;
  shouldLazyLoad = defaultFor(ENV.disqus.lazyLoad, true);
  filePath = `//${shortname}.disqus.com/${fileName}.js`;
  cachedValue = DisqusCache[filePath];

  /* Set a modified version of the URL on the window */
  if (!window.disqus_config) {
    window.disqus_config = function() {
      this.page.url = window.location.href.replace(/#\//, "");
    };
  }

  /* Set the shortname property on the window */

  if (!window.disqus_shortname) {
    window.disqus_shortname = shortname;
  }

  documentIsReady = document.readyState === 'complete';

  /* Check to see is everything else in the app has loaded for lazy loading */

  if (cachedValue) {

    /* Allow the cache to store methods for testing purposes, etc */

    if (Ember.typeOf(cachedValue) === 'function') {
      cachedValue();
    }

    /* If window has the related Disqus property, don't load anything... */

    return tryCallback(true);
  } else if (!shouldLazyLoad || documentIsReady) {

    /* ... Else if we're ready to load the Disqus API, load it... */

    Ember.$.getScript(filePath).then(tryCallback(false));

    DisqusCache[filePath] = true; // So we know API has loaded
  } else {

    /* ... Else wait a small period and check again to see if the Ember app has fully loaded. */

    Ember.run.debounce(this, function() {
      loadDisqusApi(context, fileName);
    }, 200);
  }
}
