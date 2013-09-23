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
si.use( '..', {items:['foo','bar']} )




describe('localdata', function() {
  
  it('setup', function( fin ) {
    si.act('role:localdata,cmd:inject,target:t1', function( err, out ){
      if( err ) return fin(err)
      console.log(out)
      assert.isNull(err)
      assert.ok(out.ok)
      assert.ok(2,out.items.length)

      si.act('role:t1,cmd:clr,item:foo', function( err, out ){
        console.log(out)
        assert.isNull(err)

        si.act('role:t1,cmd:clr,item:bar', function( err, out ){
          console.log(out)
          assert.isNull(err)

          fin()
        })
      })
    })
  })

  it('happy', function( fin ) {
    si.act('role:t1,cmd:put,item:foo',{data:{a:1}}, function( err, out ){
      if( err ) return fin(err)
      console.log(out)
      assert.isNull(err)
      assert.ok(out.ok)

      var origid = out.id
      
      si.act('role:t1,cmd:get,item:foo',{id:origid}, function( err, out ){
        if( err ) return fin(err)
        console.log(out)
        assert.isNull(err)
        assert.ok(out.ok)
        assert.equal(origid,out.id)
        assert.equal(1,out.data.a)
        fin()
      })
    })
  })

  it('many, del', function( fin ) {
    si.act('role:t1,cmd:put,item:bar',{data:{b:1}}, function( err, out ){
      if( err ) return fin(err)
      var b1_id = out.id

      si.act('role:t1,cmd:put,item:bar',{data:{b:2}}, function( err, out ){
        if( err ) return fin(err)

        si.act('role:t1,cmd:all,item:bar', function( err, out ){
          if( err ) return fin(err)

          console.log(out)
          assert.isNull(err)
          assert.ok(out.ok)
          assert.equal(2,out.list.length)



          si.act('role:t1,cmd:del,item:bar',{id:b1_id}, function( err, out ){
            if( err ) return fin(err)

            console.log(out)
            assert.isNull(err)
            assert.ok(out.ok)

            si.act('role:t1,cmd:get,item:bar',{id:b1_id}, function( err, out ){
              if( err ) return fin(err)

              console.log(out)
              assert.isNull(err)
              assert.ok(!out.ok)
              assert.equal(b1_id,out.id)
              assert.isNull(out.data)

              si.act('role:t1,cmd:all,item:bar', function( err, out ){
                if( err ) return fin(err)

                console.log(out)
                assert.isNull(err)
                assert.ok(out.ok)
                assert.equal(1,out.list.length)

                fin()
              })
            })
          })
        })
      })
    })    
  })

  it('digest', function( fin ) {
    si.act('role:t1,cmd:put,item:foo',{data:{y:1,z:1}}, function( err, out ){
      if( err ) return fin(err)

      si.act('role:t1,cmd:put,item:foo',{data:{x:1,y:2,z:3}}, function( err, out ){
        if( err ) return fin(err)
        var f2_id = out.id
        //console.log(f2_id)

        si.act('role:t1,cmd:dig,item:foo', function( err, out ){
          if( err ) return fin(err)

          console.log(out)

          si.act('role:t1,cmd:put,item:foo',{id:f2_id,data:{x:1,y:2,z:3,q:5}}, function( err, out ){
            if( err ) return fin(err)


            si.act('role:t1,cmd:all,item:foo', function( err, out ){
              if( err ) return fin(err)

              //console.log(out)

              si.act('role:t1,cmd:dig,item:foo', function( err, out ){
                if( err ) return fin(err)

                console.log(out)


                si.act('role:t1,cmd:dig', function( err, out ){
                  if( err ) return fin(err)

                  console.log(out)
                  fin()
                })
              })
            })
          })
        })
      })
    })
  })

})


