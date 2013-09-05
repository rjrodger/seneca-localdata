/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var _       = require('underscore')
var async   = require('async')
var fs      = require('fs')




module.exports = function( options ) {
  var seneca = this
  var name   = 'localdata'



  options = seneca.util.deepextend({
    store:{
      name:'level-store',
      options:{
        folder:'localdata',
        map:{
          '-/local/-':'*'
        }
      }
    },
    idlen:12
  },options)
  

  var entmap = {}

  
  seneca.use(options.store.name,options.store.options)
  

  seneca.add({role:name, cmd:'inject'}, 
             {target:'string$,required$',items:'array$,required$'},
             cmd_inject)


  function cmd_inject( args, done ) {
    var seneca = this

    var target = args.target
    var items  = args.items

    _.each( items, function( itemname ) {
      entmap[itemname] = seneca.make('local',itemname)

      seneca.add( {role:target, cmd:'add',    item:itemname}, {data:'object$,required$'}, target_cmd_add )
      //seneca.add( {role:target, cmd:'remove', item:itemname}, {id:'string$'}, target_cmd_remove )
      //seneca.add( {role:target, cmd:'list',   item:itemname}, target_cmd_clear )
      //seneca.add( {role:target, cmd:'digest', item:itemname}, target_cmd_digest )

    })

    done()
  }


  function target_cmd_add( args, done ) {
    var seneca = this

    var ent  = entmap[args.item]
    var data = args.data 

    if( data.id ) do_add( data )
    else seneca.act('role:util, cmd:generate_id, case:localdata', {length:options.idlen}, function(err,id){
      if( err ) return done(err);

      data.id = id
      do_add( data )
    })

    function do_add( data ) {
      var localent = ent.make$( data )
      localent.id$ = data.id

      localent.save$( function( err, outent ) {
        if( err ) return done(err);        

        done( null, {ok:true, item:outent.data$(false) })
      })
    }
  }



  seneca.add({init:name}, function( args, done ){
    if( options.store.options.folder ) {
      var folder = options.store.options.folder

      fs.exists(folder, function(exists){
        if( exists ) return done();
      
        fs.mkdir(folder, function(err){
          return done(err);
        })
      })
    }
    else return done();
  })



  return {
    name: name
  }
}
