# sigh

Sigh is currently being rewritten but will be ready again soon with better code and testing of every feature.

Sigh will be the best JavaScript asset pipeline!

* Inputs are based on simple glob expressions and the pipeline uses a simple tree structure, no more 500 line grunt files or verbose gulp files.
* It uses Functional Reactive Programming via [bacon.js](https://baconjs.github.io/), your asset pipelines are bacon streams!
* Writing plugins is simple, especially when you can reuse the good bacon.js stuff!
* Sigh can watch files for changes using the -w flag, caching results is made easy.

## Another asset pipeline

* Should support source maps at every stage of the pipeline like [plumber][plumber] and [gulp][gulp]
* Should be easy to write plugins in a small number of lines of code like [gobble][gobble]
* Should support watching files and updating the pipeline as files change like [plumber][plumber]

[plumber]: https://github.com/plumberjs/plumber
[gobble]: https://github.com/gobblejs/gobble
[gulp]: https://github.com/gulpjs/gulp

## Why write another one

* gulp is really cool but some simple operations such as merging two streams together whilst retaining source maps doesn't seem to be possible, the syntax is also a little verbose, especially when watching files is needed.
* Gobble is really cool and inspired a bunch of this, but I thought the design could be simplified by using arrays of resources as the pipeline payload rather than having exceptions in the code for various plugins.
* Broccoli is pretty cool but... no source maps. Writing plugins needs a lot of code.
* Plumber uses a version of gaze that doesn't work on linux.

## Using sigh

Install sigh-cli globally:
```
sudo npm install -g sigh-cli
```

Install sigh in your project:
```
npm install sigh
```

Write a file called "Sigh.js" and put it in the root of your project:
```javascript
var all, glob, concat, write, traceur, uglify

module.exports = function(pipelines) {
  pipelines['js:all'] = [
    all(
      [ glob('src/*.js'), traceur() ],
      glob('vendor/*.js', 'bootstrap.js')
    ),
    concat('combined'),
    uglify(),
    write('dist/assets')
  ]
}
```
This pipeline would glob files matching src/\*.js and transpile them with traceur, then concatenate that output together with the files matching vendor/\*.js followed by 'bootstrap.js' as the "all" and "glob" plugins preserve order. Finally the concatenated resource is uglified and written to the directory dist/assets.

Running "sigh -w" would compile all the files then watch the directories and files matching the glob patterns for changes. Each plugin caches resources and only recompiles the files that have changed.

sigh plugins are injected into the variables defined at the top of the file. "all", "glob", "concat", "write" and "traceur" are built-in (for now) whereas uglify is found by scanning package.json for dependency and devDependency entries of the format "sigh-\*".

### Run sigh
```shell
% sigh
```

## Writing sigh plugins

Writing a plugin for sigh is really easy. First make a node module for your plugin and in the main library file as indicated by package.json (defaulting to index.js) put something like this:

```javascript
// this plugin adds a redundant variable statement at the end of each javascript file
module.exports = function(stream, text) {
  // do whatever you want with the stream here, see https://baconjs.github.io/
  return stream.map(function(events) {
    return events.map(function(event) {
      if (event.type === 'remove')
        return // don't need to do anything for remove events

      if (event.fileType === 'js')
        event.data += '\nvar variable = "' + (text || "stuff") + '"'
      return event
    })
  })
}
```

Assuming the plugin above is called "suffixer" it could be used in a Sighfile like:
```javascript
module.exports = function(pipelines) {
  pipelines['js:all'] = [ glob('*.js'), suffixer('kittens') ]
}
```

The stream payload is an array of event objects containing:
  * type: "add", "change", "rename"
  * path: path to source file.
  * map: source map content.
  * data: file content as string.
  * fileType: the filename extension.

The first event will contain all source files, subsequent events will contain changes buffered together within a debounce interval.

## Plugin options

Some plugins accept an object as their only/final parameter to allow customisation, e.g.:

```javascript
traceur({ getModulePath: function(path) { return path.replace(/[^/]+\//, '') })
```
This causes the traceur plugin to strip the first component from the file path to create the module path.

### traceur

* getModulePath - A function which turns the relative file path into the module path.
* modules - A string denoting the type of modules traceur should output e.g. amd/commonjs.

### glob

The glob plugin takes a list of files as arguments but the first argument can be an object containing the option "debounce" which controls buffering of file changes.

```javascript
// Changes to files matching lib/*.js less than 200ms apart will be buffered
// together, the default is 500ms
glob({ debounce: 200 }, 'lib/*.js')
```

## TODO

* Source files content should be embedded in the source maps. Not having this is pretty annoying.
* sigh -w should watch Sigh.js file for changes in addition to the source files.
* Conditional pipeline operations e.g. "sigh -e dev" might avoid minification to reduce build times during development.
* Write sass, compass, less, coffeescript, eco, slim, jade and haml plugins.
