module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');

    var typescriptOptions = {
        module: 'commonjs',
        target: 'es5'
    };

    grunt.initConfig({

        typescript: {
          base: {
            src: ['src/*.ts'],
            dest: '../Primer',
            options: typescriptOptions
          },
          js: {
            src: ['src/ClientScripts/*.ts'],
            dest: './public/js',
            options: typescriptOptions
          }
        },
        less: {
          development: {
            files: {
                "public/css/style.css": "public/css/style.less"
            }
          }
        },
        watch: {
          js: {
            files: ['**/*.ts'],
            tasks: ['typescript']
          },
          styles: {
            files: ['public/css/*.less'],
            tasks: ['less']
          }
        }
    });

    grunt.registerTask('default', 'watch');
}