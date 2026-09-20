/* Photo-referenced cabinet assemblies, in metres. Dimensions are estimates.
 * Local +z is the front; tall cabinets remain full height in cutaway views.
 */
(function (global) {
  'use strict';
  function build(renderer) {
    var root=new THREE.Group();root.name='cabinets';
    var veneerCanvas=document.createElement('canvas');veneerCanvas.width=256;veneerCanvas.height=512;
    var ctx=veneerCanvas.getContext('2d'),pixels=ctx.createImageData(256,512),seed=37;
    for(var y=0;y<512;y++) for(var x=0;x<256;x++) {
      seed=(Math.imul(seed,1664525)+1013904223)|0;
      var u=x+.9*Math.sin(y/100+x*.03);
      var v=236+Math.sin(u*.47)*3+Math.sin(u*1.7)*1.6+(seed>>>0)/4294967296*3;
      var k=(y*256+x)*4;pixels.data[k]=v;pixels.data[k+1]=v;pixels.data[k+2]=v;pixels.data[k+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    var texture=new THREE.CanvasTexture(veneerCanvas);texture.encoding=THREE.sRGBEncoding;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,.6);
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    function mat(name,color,roughness,wood) {
      var m=new THREE.MeshStandardMaterial({color:color,roughness:roughness,map:wood?texture:null});
      m.color.convertSRGBToLinear();m.name=name;return m;
    }
    var M={
      wardrobe:mat('衣柜暖棕木饰面',0x977357,.65,true),
      kitchen:mat('厨房木色柜门',0x9f7857,.61,true),
      oak:mat('电视柜暖橡木',0xa47747,.56,true),
      inner:mat('柜内浅木饰面',0xb2926f,.8,true),
      white:mat('暖白哑光柜门',0xd8d6ca,.56),
      counter:mat('厨房磨砂304不锈钢台面',0xc5c8ca,.57),
      paleCounter:mat('洗手柜浅色台面',0xe3e2da,.38),
      gap:mat('柜体凹槽',0x54493b,.9),
      metal:mat('柜体金属件',0x6b6860,.4)
    };
    // Fine brushed grain and a soft reflection field, used only by the steel worktop.
    var steelCanvas=document.createElement('canvas');steelCanvas.width=steelCanvas.height=256;
    var steelCtx=steelCanvas.getContext('2d'),steelPixels=steelCtx.createImageData(256,256),steelSeed=304;
    function steelNoise() {
      steelSeed=(Math.imul(steelSeed,1664525)+1013904223)|0;
      return (steelSeed>>>0)/4294967296;
    }
    for(var sy=0;sy<256;sy++) {
      var line=steelNoise()*12;
      for(var sx=0;sx<256;sx++) {
        var sv=230+line+steelNoise()*5,si=(sy*256+sx)*4;
        steelPixels.data[si]=steelPixels.data[si+1]=steelPixels.data[si+2]=sv;
        steelPixels.data[si+3]=255;
      }
    }
    steelCtx.putImageData(steelPixels,0,0);
    var steelGrain=new THREE.CanvasTexture(steelCanvas);steelGrain.encoding=THREE.sRGBEncoding;
    steelGrain.wrapS=steelGrain.wrapT=THREE.RepeatWrapping;steelGrain.repeat.set(2,4);
    steelGrain.anisotropy=texture.anisotropy;
    var reflectionCanvas=document.createElement('canvas');reflectionCanvas.width=512;reflectionCanvas.height=256;
    var reflectionCtx=reflectionCanvas.getContext('2d'),gradient=reflectionCtx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,'#e6e8e9');gradient.addColorStop(.45,'#a0a5a9');
    gradient.addColorStop(.65,'#73787b');gradient.addColorStop(1,'#55595c');
    reflectionCtx.fillStyle=gradient;reflectionCtx.fillRect(0,0,512,256);
    reflectionCtx.fillStyle='#f4f5f5';reflectionCtx.fillRect(56,40,108,88);
    reflectionCtx.fillStyle='#cdd0d2';reflectionCtx.fillRect(314,48,74,75);
    var reflection=new THREE.CanvasTexture(reflectionCanvas);reflection.encoding=THREE.sRGBEncoding;
    reflection.mapping=THREE.EquirectangularReflectionMapping;
    var pmrem=new THREE.PMREMGenerator(renderer),steelEnvironment=pmrem.fromEquirectangular(reflection);
    M.counter.metalness=1;M.counter.map=steelGrain;
    M.counter.bumpMap=steelGrain;M.counter.bumpScale=.00012;
    M.counter.envMap=steelEnvironment.texture;M.counter.envMapIntensity=.9;
    reflection.dispose();pmrem.dispose();
    function box(g,x,y,z,w,h,d,material) {
      var geometry=new THREE.BoxGeometry(w,h,d),pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
      for(var i=0;i<pos.count;i++) {
        var px=pos.getX(i)+x+w/2,py=pos.getY(i)+y+h/2,pz=pos.getZ(i)+z+d/2;
        if(Math.abs(normal.getY(i))>.5) uv.setXY(i,px,pz);
        else uv.setXY(i,Math.abs(normal.getX(i))>.5?pz:px,py);
      }
      var mesh=new THREE.Mesh(geometry,material);mesh.position.set(x+w/2,y+h/2,z+d/2);
      mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
    }
    function assembly(id,label,room,x,y,z,rotation) {
      var g=new THREE.Group();g.name=id;g.userData={kind:'cabinet',label:label,room:room};
      g.position.set(x,y,z);g.rotation.y=rotation||0;root.add(g);return g;
    }
    function part(g,x,y,z,rotation) {
      var p=new THREE.Group();p.position.set(x,y,z);p.rotation.y=rotation||0;g.add(p);return p;
    }
    function carcass(g,w,h,d,material) {
      var t=.018;
      box(g,0,0,0,w,t,d,material);box(g,0,h-t,0,w,t,d,material);
      box(g,0,t,0,t,h-2*t,d,material);box(g,w-t,t,0,t,h-2*t,d,material);
      box(g,t,t,0,w-2*t,h-2*t,.012,M.inner);
    }
    function face(g,x,y,w,h,d,material,handle) {
      // Real board thickness and 3 mm reveals distinguish doors from a solid box.
      box(g,x+.0015,y+.0015,d-.023,w-.003,h-.003,.020,material);
      if(handle) box(g,x+.012,y+h-.011,d-.002,w-.024,.008,.002,M.gap);
    }
    function wardrobe(g,w) {
      var h=2.66,d=.58,split=2.08,plinth=.075;
      box(g,.025,0,.03,w-.05,plinth,d-.065,M.gap);
      var body=part(g,0,plinth,0);carcass(body,w,h-plinth,d,M.wardrobe);
      box(g,.018,split-.018,.012,w-.036,.018,d-.025,M.wardrobe);
      box(g,w/2-.009,plinth,.012,.018,split-plinth,d-.025,M.inner);
      box(g,.018,.58,.012,w/2-.027,.018,d-.025,M.inner);
      for(var i=0;i<4;i++) {
        var x=i*w/4;
        face(g,x,split+.005,w/4,h-split-.005,d,M.wardrobe,false);
        var low=i<2?.59:plinth+.005;
        face(g,x,low,w/4,split-low-.012,d,M.wardrobe,false);
      }
      face(g,0,plinth+.004,w/2,.247,d,M.wardrobe,true);
      face(g,0,.331,w/2,.247,d,M.wardrobe,true);
      // Recessed horizontal grips match the dark drawer lines in the photos.
      box(g,.018,split-.011,d-.025,w-.036,.009,.017,M.gap);
    }
    function baseCabinet(g,w,h,d,material,drawers,blindRight) {
      var kick=.075;box(g,.025,0,.025,w-.05,kick,d-.06,M.gap);
      var body=part(g,0,kick,0);carcass(body,w,h-kick,d,material);
      var usable=w-(blindRight||0),n=Math.max(1,Math.round(usable/.53)),pitch=usable/n;
      if(blindRight) face(g,usable,kick,blindRight,h-kick-.009,d,material,false);
      for(var i=0;i<n;i++) {
        if(drawers&&i===n-1) {
          var dh=(h-kick-.009)/3;
          for(var j=0;j<3;j++) face(g,i*pitch,kick+j*dh,pitch,dh-.003,d,material,true);
        } else face(g,i*pitch,kick,pitch,h-kick-.009,d,material,true);
      }
    }
    function upper(g,w,h,d) {
      carcass(g,w,h,d,M.white);
      var n=Math.max(1,Math.round(w/.48));
      for(var i=0;i<n;i++) face(g,i*w/n,0,w/n,h,d,M.white,false);
      box(g,.016,.006,d-.025,w-.032,.006,.02,M.gap);
    }

    // North wall of the master; leave the west door's swing clear.
    wardrobe(assembly('master-wardrobe','主卧衣柜','主卧',6.085,0,3.697),1.75);
    // East wall of the second bedroom, ending before the door opening.
    wardrobe(assembly('bed2-wardrobe','次卧衣柜','次卧',2.843,0,.265,-Math.PI/2),2.32);

    var dining=assembly('dining-cabinet','餐边储物柜','客餐厅',3.035,0,.26);
    box(dining,.025,0,.025,1.86,.075,.345,M.gap);
    var diningBase=part(dining,0,.075,0);carcass(diningBase,1.91,.815,.405,M.white);
    box(dining,.018,.701,.012,1.874,.018,.37,M.inner);
    for(var di=0;di<4;di++) face(dining,di*1.91/4,.079,1.91/4,.619,.405,M.white,false);
    for(var dj=0;dj<3;dj++) face(dining,dj*1.91/3,.72,1.91/3,.16,.405,M.white,true);
    box(dining,0,.89,0,1.91,.032,.422,M.wardrobe);
    box(dining,0,.922,0,1.91,.538,.018,M.wardrobe);
    var diningUpper=part(dining,0,1.46,0);upper(diningUpper,1.91,1.18,.35);

    var kitchen=assembly('kitchen-cabinets','厨房橱柜','厨房',6.80,0,.26);
    // Set back from the sliding-door entrance to leave a turning area.
    var kw=2.38,kd=.58,kh=.825;
    baseCabinet(kitchen,kw,kh,kd,M.kitchen,false,.59);
    box(kitchen,-.012,kh,-.008,kw+.024,.033,kd+.026,M.counter);
    box(kitchen,0,kh+.033,0,kw,.045,.018,M.counter);
    var returnBase=part(kitchen,kw,0,kd,-Math.PI/2);
    baseCabinet(returnBase,.895,kh,.565,M.kitchen,false);
    box(returnBase,.018,kh,-.008,.887,.033,.59,M.counter);
    var upperLeft=part(kitchen,0,1.59,0);upper(upperLeft,.56,1.04,.32);
    var hoodBridge=part(kitchen,.56,2.20,0);upper(hoodBridge,.72,.43,.32);
    var upperRight=part(kitchen,1.28,1.59,0);upper(upperRight,1.10,1.04,.32);
    var upperReturn=part(kitchen,kw,1.59,.32,-Math.PI/2);upper(upperReturn,1.155,1.04,.32);

    var tv=assembly('tv-console','电视柜','客餐厅',5.122,0,4.87,-Math.PI/2);
    var tw=2.10,td=.365;
    [[.10,.07],[tw-.14,.07],[.10,td-.11],[tw-.14,td-.11]].forEach(function(p){box(tv,p[0],0,p[1],.035,.14,.035,M.oak);});
    var tvBody=part(tv,0,.14,0);carcass(tvBody,tw,.35,td,M.oak);
    box(tv,-.008,.49,-.007,tw+.016,.022,td+.022,M.oak);
    face(tv,0,.145,.52,.337,td,M.white,false);face(tv,.523,.145,.52,.337,td,M.white,false);
    box(tv,1.05,.145,.012,.018,.337,td-.025,M.oak);
    box(tv,1.585,.145,.012,.018,.337,td-.025,M.oak);
    box(tv,1.069,.285,.012,.516,.018,td-.025,M.oak);
    face(tv,1.067,.147,.517,.13,td,M.oak,true);
    face(tv,1.604,.147,.492,.158,td,M.white,true);face(tv,1.604,.311,.492,.172,td,M.white,true);

    var dresser=assembly('master-dresser','主卧化妆柜','主卧',6.33,0,7.428,Math.PI);
    box(dresser,0,.737,0,.98,.029,.43,M.oak);
    box(dresser,.016,0,.03,.028,.737,.365,M.oak);
    var drawers=part(dresser,.625,.055,.015);carcass(drawers,.34,.674,.40,M.oak);
    for(var dr=0;dr<3;dr++) face(drawers,0,dr*.223,.34,.218,.40,M.white,true);
    box(dresser,.055,.62,.012,.55,.018,.36,M.oak);

    var vanity=assembly('washbasin-cabinet','洗手区地柜','客餐厅',5.943,.17,2.885,-Math.PI/2);
    carcass(vanity,.66,.63,.42,M.white);
    face(vanity,0,.015,.33,.595,.42,M.white,false);face(vanity,.33,.015,.33,.595,.42,M.white,false);
    box(vanity,-.006,.63,-.003,.672,.028,.445,M.paleCounter);
    var vanityUpper=assembly('washbasin-upper','洗手区吊柜','客餐厅',5.943,2.035,2.885,-Math.PI/2);
    upper(vanityUpper,.66,.57,.27);

    root.updateMatrixWorld(true);
    root.children.forEach(function(g) {
      var b=new THREE.Box3().setFromObject(g);
      g.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};
    });
    return {root:root};
  }
  global.CABINETS={build:build};
})(window);
