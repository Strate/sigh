import _ from 'lodash'
import Promise from 'bluebird'
import path from 'path'

import { UserError, rootErrorHandler } from './errors'
import Resource from './Resource'

var DEBOUNCE_MS = 200

/// interface Chainable {
///   execute(inputs),
///   type: 'operation'
/// }
/// @detail type can be:
///   operation - consumes and produces resources
///   source - consumes nothing and produces resources
///   sink - consumes resources and produces nothing
///   void - consumes nothing and produces nothing

export default class /* implements Chainable */ {
  constructor(func, nextOp) {
    this.type = 'operation'
    this._func = func
    this._nextOp = nextOp
    this._resources = {}
  }

  // Append an operation after all subsequent operations.
  append(appendOp) {
    var op = this
    while (op._nextOp)
      op = op._nextOp
    op._nextOp = appendOp
  }

  get forWatch() {
    return this.inputs === 'watch'
  }
  get forBuild() {
    return this.inputs === 'build'
  }

  // ensure this is a source operation (one with no inputs)
  assertSource() {
    if (this.inputs instanceof Array)
      throw new UserError('expected operation to be source')
  }

  // Execute this operation with the given inputs.
  execute(inputs) {
    this.inputs = inputs
    return Promise.try(() => {
      return this._func(this)
    })
    .then(this._next.bind(this))
  }

  resource(filePath) {
    var fullPath = path.resolve(filePath);
    return this._resources[fullPath] || (this._resources[fullPath] = new Resource(filePath))
  }

  resources() {
      return _.values(this._resources)
  }

  removeResource(filePath) {
    var fullPath = path.resolve(filePath);
    delete this._resources[fullPath]
  }

  /// Trigger re-execution of the upstream pipeline asynchronously (e.g. due
  /// to a file change)
  /// @param inputs Array of resources to pass down the pipeline, if not passed
  ///               then all resources created with this.resource() are passed.
  next(resources) {
    if (! this._debounceNext) {
      this._debounceNext = _.debounce(resources => {
        Promise.try(this._next.bind(this, resources)).catch(rootErrorHandler)
      }, DEBOUNCE_MS)
    }
    this._debounceNext(resources || this.resources())
  }

  _next(resources) {
    if (this._nextOp) {
      if (resources === undefined) {
        if (this._nextOp.type !== 'void')
          throw new UserError('only operations of type "void" or "sink" may end a pipeline')
        return this._nextOp.execute()
      }
      else {
        return this._nextOp.execute(resources.map(resource => resource.clone()))
      }
    }
    else {
      return resources
    }
  }
}
