(function initializeRuntimeConfig() {
  const existingConfig = globalThis.config || {};
  const currentScriptUrl = document.currentScript?.src;

  const normalizeAppBasePath = (value) => {
	if (!value) {
	  return '/ext/scs';
	}

	const withoutConfigSuffix = String(value).trim().replace(/\/config\.js$/i, '');
	// Trailing slashes are trimmed with a loop rather than /\/+$/: that pattern is quadratic on a
	// long run of slashes that does not reach the end (295ms at 32k chars), and this runs on every
	// page load before the app boots.
	let end = withoutConfigSuffix.length;
	while (end > 0 && withoutConfigSuffix[end - 1] === '/') {
	  end -= 1;
	}
	const normalizedValue = withoutConfigSuffix.slice(0, end);

	if (!normalizedValue || normalizedValue === '.') {
	  return '/';
	}

	return normalizedValue.startsWith('/') ? normalizedValue : `/${normalizedValue}`;
  };

  let inferredAppBasePath = existingConfig.APP_BASE_PATH;

  if (!inferredAppBasePath && currentScriptUrl) {
	try {
	  inferredAppBasePath = new URL(currentScriptUrl, globalThis.location.href).pathname;
	} catch {
	  inferredAppBasePath = currentScriptUrl;
	}
  }

  globalThis.config = {
	...existingConfig,
	APP_BASE_PATH: normalizeAppBasePath(inferredAppBasePath),
  };
})();
