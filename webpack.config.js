const webpack = require('webpack');
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

var BUILD_DIR = path.resolve(__dirname, 'dist/');
var DEV = true

var config = {
    context: __dirname,
    entry: ['app.html', 'app.jsx'],
    output: {
        path: BUILD_DIR,
        publicPath: '',
        filename: '[name].[hash].js',
        chunkFilename: '[name].[chunkhash].js',
    },
    module : {
        loaders : [
            {
                test : /\.jsx?$/,
                loader : 'babel-loader',
                exclude: /node_modules|dist/,
                query: {
                    presets : ['react', 'es2015', 'stage-0'],
                    // plugins: ['transform-runtime'],
                    cacheDirectory: DEV

                },
            },
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.scss$/,
                loaders: ['style', 'css', 'sass']
            },
            {
                test: /\.css$/,
                loaders: ['style', 'css']
            },
            {
                test: /\.(png|eot|tiff|svg|woff2|woff|ttf|gif|mp3|jpg)$/,
                loaders: [
                    'file?name=files/[hash].[ext]',
                    'image-webpack'
                ]
            },
            {
                test: /\.html$/,
                loader: 'html-loader?attrs=link:href'
            },
        ]
    },
    devtool: 'source-map',
    plugins: [
        new webpack.LoaderOptionsPlugin({
            minimize: false,
            debug: true
        }),
        new HtmlWebpackPlugin({
            filename: 'app.html',
            inject: 'head',
            template: 'app.html'
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('development')
            }
        }),

        new webpack.optimize.CommonsChunkPlugin({
            minChunks: 2,
            children: true
        })
    ],
    resolve: {
        // root: [path.resolve('.'), 'node_modules'],
        extensions: ['.js', '.jsx'],
        modules: [
            'components',
            'datastructures',
            'node_modules',
            path.resolve(__dirname)
        ]
    }
};


module.exports = config;
