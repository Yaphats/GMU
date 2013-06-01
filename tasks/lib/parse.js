(function() {
    'use strict';

    var path = require( 'path' ),
        glob = require( 'glob' ),
        file = require( 'grunt/lib/grunt/file' );

    function buildComponents( opts, files ) {
        var prefix = path.resolve( opts.srcPath ) + path.sep,
            cssPrefix = path.resolve(opts.cssPath) + path.sep,
            ret = [],
            hash = {},
            parse = function ( path ) {
                var css = {},
                    content,
                    cssPath,
                    exists,
                    depends,    // dependencies
                    item,
                    matches;

                // 如果文件不存在，则直接跳过, 同时从数组中过滤掉
                // 或者已经处理过也跳过
                if (!(exists = file.exists((prefix + path))) ||
                        hash.hasOwnProperty(path)) {

                    return exists;
                }

                content = file.read(prefix + path);

                // 读取文件内容中对js的依赖 格式为：@import core/zepto.js
                matches = content.match(/@import\s(.*?)\n/i);
                if (matches) {
                    depends = matches[1]

                        // 多个依赖用道号隔开
                        .split(/\s*,\s*/g);

                    depends.forEach(parse);
                }

                // 查找css文件，对应的目录在assets目录下面的widgetName/widget.css
                // 或者widgetName/widget.plugin.css
                cssPath = path.replace(/\/(.+)\.js$/, function (m0, m1) {
                    var
                        //插件的css并不在插件名所在目录，而是对应的组件名所在目录
                        name = m1.replace(/\..+$/, '');

                    return '/' + name + '/' + m1 + '.css';
                });

                // 检查骨架css是否存在
                if (file.exists(cssPrefix + cssPath)) {
                    css.structor = cssPath;
                }

                // 查找themes
                glob.sync(cssPath.replace(/\.css$/, '\\.*\\.css'),
                        {cwd: cssPrefix})
                    .forEach(function (item) {
                        var m = item.match(/\.([^\.]*)\.css$/i);
                        m && ~opts.aviableThemes.indexOf(m[1]) && (css[m[1]] = item );
                    });

                // 读取文件内容中对css的依赖 格式为：@importCSS loading.css
                matches = content.match(/@importCSS\s(.*?)\n/i);
                if (matches) {
                    css.dependencies = matches[1]

                        // 多个依赖用道号隔开
                        .split(/\s*,\s*/g)
                        .map(function (item) {
                            var ret = {};

                            // 可能只有骨架css存在，也可能只有主题css存在
                            file.exists(cssPrefix + item) && 
                                    (ret.structor = item);

                            glob.sync(item.replace(/\.css$/, '\\.*\\.css'),
                                    {cwd: cssPrefix})

                                .forEach(function (item) {
                                    var m = item.match(/\.([^\.]*)\.css$/i);
                                    m && ~opts.aviableThemes.indexOf(m[1]) && (ret[m[1]] = item );
                                });
                            return ret;
                        });
                }

                item = {
                    path: path,
                    dependencies: depends,
                    css: css
                };

                // 将path作为key保存在hash表中，以避免重复解析
                hash[path] = item;
                ret.push(item);

                return true;
            };

        files.filter(parse);

        return ret;
    }

    module.exports = buildComponents;
})();