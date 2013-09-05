/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";

// mocha localdata.test.js


var seneca  = require('seneca')

var assert  = require('chai').assert

var gex     = require('gex')
var async   = require('async')
var _       = require('underscore')




function cberr(win){
  return function(err){
    if(err) {
      assert.fail(err, 'callback error')
    }
    else {
      win.apply(this,Array.prototype.slice.call(arguments,1))
    }
  }
}




var si = seneca()
si.use( '..' )




describe('localdata', function() {
  
  it('setup', function( fin ) {
    si.act('role:localdata,cmd:inject,target:t1',{items:['foo']}, function( err, out ){
      if( err ) return fin(err)
      console.log(out)
      fin()
    })
  })

  it('happy', function( fin ) {
    si.act('role:t1,cmd:add,item:foo',{data:{a:1}}, function( err, out ){
      if( err ) return fin(err)
      console.log(out)
      fin()
    })
  })
})


