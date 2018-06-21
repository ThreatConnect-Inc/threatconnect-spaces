var grunt = require('grunt');
var path = require('path');
var mkdirp = require('mkdirp');

grunt.initConfig({
  app: {
    name: 'Note_Taker',
    version: '1.0'
  },

  copy: {
    main: {
      cwd: 'target/dist/',
      src: ['**', '!*.eot', '!*.svg', '!*.ttf', '!*.woff'],
      dest: 'target/<%= app.name %>_v<%= app.version %>/ui/',
      expand: true
    },
    installJson: {
      src: 'install.json',
      dest: 'target/<%= app.name %>_v<%= app.version %>',
      expand: true
    },
    readme: {
      src: 'README.md',
      dest: 'target/<%= app.name %>_v<%= app.version %>',
      expand: true
    },
    parameters: {
      src: 'install.json',
      dest: 'target/<%= app.name %>_v<%= app.version %>/ui',
      expand: true
    }
  },

  clean: {
    bundle: {
      src: [
        'target/'
      ],
      options: {
        expand: true
      }
    }
  },

  exec: {
    createDirectory: {
      cmd: function() {
        var dir = 'target/dist';
        mkdirp(dir, console.log);

        return 'ls';
      }
    },
    buildProd: path.relative('', 'node_modules/.bin/ng build') +  ' --aot --prod --output-path target/dist --base-href .',
    buildDev: path.relative('', 'node_modules/.bin/ng build') +  ' --aot --output-path target/dist --base-href .',
    serve: path.relative('', 'node_modules/.bin/ng serve')
  },


  tslint: {
    options: {
      configuration: grunt.file.readJSON('tslint.json')
    },
    files: {
      src: ['app/**/*.ts']
    }
  },

  compress: {
    main: {
      options: {
        archive: 'target/<%= app.name %>_v<%= app.version %>.tcx',
        pretty: true,
        mode: 'zip'
      },
      expand: true,
      cwd: 'target/<%= app.name %>_v<%= app.version %>/',
      src: ['**/*'],
      dest: '/<%= app.name %>_v<%= app.version %>/'
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-compress');
grunt.loadNpmTasks('grunt-exec');

grunt.registerTask(
  'buildProd',
  'Compiles all assets and source files into build directory.',
  [
    'clean',
    'exec:createDirectory',
    'exec:buildProd',
    'copy',
    'compress',
  ]
);

grunt.registerTask(
  'buildDev',
  'Compiles all assets and source files into build directory.',
  [
    'clean',
    'exec:createDirectory',
    'exec:buildDev',
    'copy',
    'compress'
  ]
);

grunt.registerTask(
  'serve',
  'Runs the build, then serves the project locally.',
  [
    'exec:serve'
  ]
);

grunt.registerTask(
  'default',
  'Run default build',
  [
    'buildProd'
  ]
);
