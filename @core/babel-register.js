require('@babel/register')({
    extensions: ['.js', '.ts'],
    presets: ['@babel/preset-env'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
      ['@babel/plugin-proposal-class-properties']
    ],
    ignore: [/node_modules/]
  });
  