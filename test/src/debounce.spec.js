import Bacon from 'baconjs'

import PipelineCompiler from '../lib/PipelineCompiler'
import Event from '../lib/Event'
import debounce from '../lib/plugin/debounce'
import { plugin, makeEvent } from './helper'

describe('debounce plugin', () => {
  it('debounces two streams', () => {
    var streams = Bacon.fromArray([ 1, 2 ].map(idx => [ makeEvent(idx) ]))
    var compiler = new PipelineCompiler
    var opData = { compiler }

    return compiler.compile([
      plugin(op => streams),
      plugin(debounce, 100)
    ])
    .then(streams => streams.toPromise(Promise))
    .then(events => {
      events = events.sort()
      events[0].path.should.equal('file1.js')
      events.length.should.equal(2)
      events[1].path.should.equal('file2.js')
    })
  })
})
