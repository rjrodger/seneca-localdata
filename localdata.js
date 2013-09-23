/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var fs      = require('fs')
var crypto  = require('crypto')

var _       = require('underscore')
var async   = require('async')



var hexval = {
  '0':0,
  '1':1,
  '2':2,
  '3':3,
  '4':4,
  '5':5,
  '6':6,
  '7':7,
  '8':8,
  '9':9,
  'a':10,
  'b':11,
  'c':12,
  'd':13,
  'e':14,
  'f':15,
}


module.exports = function( options ) {
  var seneca = this
  var name   = 'localdata'


  options = seneca.util.deepextend({
    items:[],
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
  var counts = {}

  var allhashes = {}
  var alldigest

  var hashes = {}
  var digests = {}


  _.each( options.items, function( itemname ) {
    counts[itemname] = 0
    hashes[itemname] = {}
  })


  seneca.use(options.store.name,options.store.options)
  

  seneca.add({role:name, cmd:'inject'}, 
             {target:'string$,required$'},
             cmd_inject)


  function cmd_inject( args, done ) {
    var seneca = this

    var target = args.target
    var items  = options.items

    _.each( items, function( itemname ) {
      entmap[itemname] = seneca.make('local',itemname)

      seneca.add( {role:target, cmd:'put', item:itemname}, {data:'object$,required$'}, target_cmd_put )
      seneca.add( {role:target, cmd:'get', item:itemname}, {id:'string$,required$'}, target_cmd_get )
      seneca.add( {role:target, cmd:'del', item:itemname}, {id:'string$,required$'}, target_cmd_delete )
      seneca.add( {role:target, cmd:'all', item:itemname}, target_cmd_all )
      seneca.add( {role:target, cmd:'clr', item:itemname}, target_cmd_clear )
      seneca.add( {role:target, cmd:'dig', item:itemname}, target_cmd_digest )

    })

    seneca.add( {role:target, cmd:'dig'}, target_cmd_digest )

    done(null,{ok:true,items:items})
  }


  function target_cmd_put( args, done ) {
    var seneca = this

    var ent  = entmap[args.item]
    var data = args.data 

    if( args.id ) {
      data.id = args.id
      do_put( data )
    }
    else seneca.act('role:util, cmd:generate_id, case:localdata', {length:options.idlen}, function(err,id){
      if( err ) return done(err);

      data.id = id
      return do_put( data )
    })

    function do_put( data ) {
      counts[args.item]++

      if( void 0 == args.save || args.save ) {
        var localent = ent.make$( data )
        localent.id$ = data.id

        localent.save$( function( err, outent ) {
          if( err ) return done(err);        

          //done( null, {ok:true, id:outent.id, data:outent.data$(false) })
          return do_hash( outent.id, outent.data$(false) )
        })
      }
      //else return done( null, {ok:true, id:data.id, data:data })
      else return do_hash( data.id, data );
    }

    function do_hash( id, data ) {
      var summarybase = []
      _.each( data, function(v,k){
        if( 'id'==k || ~k.indexOf('$') ) return;
        summarybase.push( k+v )
      })
      summarybase.sort()
  
      var summary = _.map( summarybase, function( entry ){
        var md5 = crypto.createHash('md5')
        md5.update( entry, 'utf8' )
        return md5.digest('hex')
      })

      var digest = _.map( summary, function(h){
        return h[hexval[h[0]]+hexval[h[31]]]+h[hexval[h[8]]+hexval[h[15]]]
        //return h
      }).join('')

      allhashes[id] = digest
      hashes[args.item][id] = digest

      alldigest = void 0
      digests[args.item] = void 0

      return done( null, {ok:true, id:id, data:data } );
    }
  }


  function target_cmd_get( args, done ) {
    var seneca = this

    var ent = entmap[args.item]

    ent.load$( args.id, function( err, out ){
      if( err ) return done(err);        
      done( null, {ok:!!out,id:args.id,data:out?out.data$(false):null})
    })
  }


  function target_cmd_delete( args, done ) {
    var seneca = this

    var ent = entmap[args.item]

    ent.remove$( args.id, function( err, out ){
      if( err ) return done(err);        
      done( null, {ok:true})
    })
  }


  function target_cmd_all( args, done ) {
    var seneca = this

    var ent = entmap[args.item]

    ent.list$( function( err, out ){
      if( err ) return done(err);        
      done( null, {ok:true,list:out})
    })
  }


  function target_cmd_clear( args, done ) {
    var seneca = this

    var ent = entmap[args.item]

    ent.remove$({all$:true},function(err){
      if( err ) return done(err);
      return done(null,{ok:true})
    })
  }


  function target_cmd_digest( args, done ) {
    var seneca = this

    var itemname = args.item

    //console.dir(allhashes)
    //console.dir(alldigest)
    //console.dir(hashes[itemname])
    //console.dir(digests[itemname])

    
    if( null == itemname ) {
      if( void 0 != alldigest ) return done( null, {ok:true,digest:alldigest});

      return done( null, {ok:true, digest:alldigest = digest(allhashes)} );
    }
    else if( void 0 != digests[itemname] ) return done( null, {ok:true,digest:digests[itemname]});
    else {
      digests[itemname] = digest(hashes[itemname])
      return done( null, {ok:true,digest:digests[itemname]});
    }

    function digest( hm ) {
      var hsb = []
      _.each( hm, function( hash ){
        hsb.push(hash)
      })
      return hsb.sort().join('')
    }

  }




  seneca.add({init:name}, function( args, done ){
    var seneca = this

    if( options.store.options.folder ) {
      var folder = options.store.options.folder

      fs.exists(folder, function(exists){
        if( exists ) return done();
      
        fs.mkdir(folder, function(err){
          if( err ) return done(err);

          return load_items();
        })
      })
    }
    else return load_items();


    function load_items() {
      async.mapSeries( options.items, function( itemname, next ) {
        var ent = entmap[itemname]

        ent.list$( function( err, list ){
          if( err ) return next(err);        

          async.mapSeries( list, function( itement, subnext ) {
            seneca.act( {role:name, cmd:'put', item:itemname, id:out.id, data:out.data$(false), save:false}, subnext)
          }, next )
        })

      }, done)
    }
  })



  return {
    name: name
  }
}
