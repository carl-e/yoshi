const DEFAULT_ENV = 'development';
const DEFAULT_MODULES = 'commonjs';
const env = process.env.BABEL_ENV || process.env.NODE_ENV || DEFAULT_ENV;

const isDevelopment = env === 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

const requireDefault = path => {
  const required = require(path);
  return required.default || required;
};

const normaliseOptions = opts => {
  return {
    ...opts,
    include: opts.include || [],
    exclude: opts.exclude || [],
  };
};

module.exports = function(api, opts = {}) {
  const options = normaliseOptions(opts);
  const inWebpack = process.env.IN_WEBPACK;
  let { modules } = options;
  if (typeof modules === 'undefined') {
    modules = inWebpack ? false : DEFAULT_MODULES;
  }

  return {
    presets: [
      [
        requireDefault('@babel/preset-env'),
        {
          modules,
          // Display targets to compile for.
          debug: options.debug,
          // Always use destructuring b/c of import/export support.
          include: ['transform-destructuring', ...options.include],
          exclude: options.exclude,
          // We don't need to be fully spec compatible, bundle size is more important.
          loose: true,
          // Allow users to provide its own targets and supply target node for test environment by default.
          targets: options.targets || (isTest && 'current node'),
        },
      ],
      !options.ignoreReact && [
        requireDefault('@babel/preset-react'),
        {
          development: isDevelopment || isTest,
        },
      ],
    ].filter(Boolean),
    plugins: [
      // Enable stage 2 decorators.
      [
        requireDefault('@babel/plugin-proposal-decorators'),
        {
          // Enable export after decorator syntax. It's also a part of the spec and tc39 is not made a decision about it.
          // Read more https://github.com/tc39/proposal-decorators/issues/69
          decoratorsBeforeExport: true,
        },
      ],
      [
        // Allow the usage of class properties.
        requireDefault('@babel/plugin-proposal-class-properties'),
        {
          // Bundle size and perf is prior to tiny ES spec incompatibility.
          loose: true,
        },
      ],
      [
        // Add helpers for generators and async/await.
        requireDefault('@babel/plugin-transform-runtime'),
        {
          // 2 options blow are usually handled by pollyfil.io.
          helpers: false,
          regenerator: true,
        },
      ],
      requireDefault('@babel/plugin-syntax-dynamic-import'),
      // https://github.com/airbnb/babel-plugin-dynamic-import-node/issues/27
      !inWebpack && requireDefault('babel-plugin-dynamic-import-node'),
      // Current Node and new browsers (in development environment) already implement it so
      // just add the syntax of Object { ...rest, ...spread }
      (isDevelopment || isTest) &&
        requireDefault('@babel/plugin-syntax-object-rest-spread'),

      ...(!isProduction
        ? []
        : [
            // Transform Object { ...rest, ...spread } to support old browsers
            requireDefault('@babel/plugin-proposal-object-rest-spread'),
            !options.ignoreReact && [
              // Remove PropTypes on react projects.
              requireDefault('babel-plugin-transform-react-remove-prop-types'),
              {
                removeImport: true,
              },
            ],
          ]),
    ].filter(Boolean),
  };
};
