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
    function carcass(g,w,h,d,material,openTop) {
      var t=.018;
      box(g,0,0,0,w,t,d,material);
      if(!openTop) box(g,0,h-t,0,w,t,d,material);
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
    function baseCabinet(g,w,h,d,material,drawers,blindRight,openTop) {
      var kick=.075;box(g,.025,0,.025,w-.05,kick,d-.06,M.gap);
      var body=part(g,0,kick,0);carcass(body,w,h-kick,d,material,openTop);
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
    // The tiled corner projection occupies x 8.78–9.20, z .24–.60.
    // Cooking worktop is lower than the sink run; both stop at the wall.
    var kw=2.38,kd=.58,lowTop=.82,highTop=.90,thickness=.033,lowWidth=1.80;
    var cooking=part(kitchen,0,0,0);cooking.name='kitchen-cooking-base';
    baseCabinet(cooking,lowWidth,lowTop-thickness,kd,M.kitchen,false);
    // Shallow closed filler behind the high cabinet, outside the wall footprint.
    var cornerFiller=part(cooking,lowWidth,0,0);
    carcass(cornerFiller,.16,lowTop-thickness,.34,M.kitchen);
    var worktopShape=new THREE.Shape();
    var worktopOutline=[[-.012,-.008],[1.968,-.008],[1.968,.36],[lowWidth,.36],[lowWidth,kd+.018],[-.012,kd+.018]];
    worktopOutline.forEach(function(p,i){if(i)worktopShape.lineTo(p[0],-p[1]);else worktopShape.moveTo(p[0],-p[1]);});
    worktopShape.closePath();
    var worktopGeometry=new THREE.ExtrudeGeometry(worktopShape,{depth:thickness,bevelEnabled:false});
    worktopGeometry.rotateX(-Math.PI/2);worktopGeometry.translate(0,lowTop-thickness,0);
    var worktop=new THREE.Mesh(worktopGeometry,M.counter);worktop.name='kitchen-low-worktop';
    worktop.castShadow=true;worktop.receiveShadow=true;cooking.add(worktop);
    box(cooking,0,lowTop,0,1.968,.045,.018,M.counter);
    var returnBase=part(kitchen,kw,0,.36,-Math.PI/2);returnBase.name='kitchen-sink-base';
    baseCabinet(returnBase,1.115,highTop-thickness,.565,M.kitchen,false,0,true);
    // Share the sink mount with the fixture model so its bowl matches the opening.
    var sinkMount={position:[9.18,0,.62],rotation:-Math.PI/2,x:.58,z:.31,width:.68,depth:.36,top:highTop};
    var highShape=new THREE.Shape();highShape.moveTo(0,.008);highShape.lineTo(1.125,.008);
    highShape.lineTo(1.125,-.582);highShape.lineTo(0,-.582);highShape.closePath();
    var cutout=new THREE.Path(),sx=sinkMount.x,sz=sinkMount.z,sw=sinkMount.width/2,sd=sinkMount.depth/2;
    cutout.moveTo(sx-sw,-sz-sd);cutout.lineTo(sx+sw,-sz-sd);cutout.lineTo(sx+sw,-sz+sd);cutout.lineTo(sx-sw,-sz+sd);cutout.closePath();
    highShape.holes.push(cutout);
    var highGeometry=new THREE.ExtrudeGeometry(highShape,{depth:thickness,bevelEnabled:false});
    highGeometry.rotateX(-Math.PI/2);highGeometry.translate(0,highTop-thickness,0);
    var highWorktop=new THREE.Mesh(highGeometry,M.counter);highWorktop.castShadow=true;highWorktop.receiveShadow=true;returnBase.add(highWorktop);
    highWorktop.name='kitchen-high-worktop';
    box(returnBase,0,highTop,0,1.115,.045,.018,M.counter);
    // Stainless riser closes the visible step where the two worktops meet.
    box(returnBase,0,lowTop,.570,.238,highTop-lowTop,.012,M.counter);
    var upperLeft=part(kitchen,0,1.59,0);upper(upperLeft,.56,1.04,.32);
    var hoodBridge=part(kitchen,.56,2.20,0);upper(hoodBridge,.72,.43,.32);
    var upperRight=part(kitchen,1.28,1.59,0);upper(upperRight,.68,1.04,.32);
    var upperReturn=part(kitchen,kw,1.59,.36,-Math.PI/2);upper(upperReturn,1.115,1.04,.32);

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

    // Beside the bed on its window side, backed against the same east wall as the headboard.
    var dresser=assembly('master-dresser','主卧化妆柜','主卧',7.838,0,6.687,-Math.PI/2);
    // IMG_0212: the 50 cm desk / storage stool combination, with a rear tray and folding mirror.
    var dresserWood=mat('梳妆台棕色木饰面',0x8d593b,.53,true);
    var dresserPale=mat('收纳凳浅木抽屉',0xc8aa81,.61,true);
    var dresserCream=mat('收纳凳奶白抽屉',0xe4e1d3,.55);
    var dresserCushion=mat('收纳凳棕色软垫',0xa67b60,.88);
    var dresserChrome=mat('化妆镜银色支架',0xc7c7bd,.23);
    dresserChrome.metalness=1;dresserChrome.envMap=steelEnvironment.texture;
    function softBoard(g,x,y,z,w,h,d,material,radius) {
      var r=Math.min(radius||.005,w/3,h/3,d/3),shape=new THREE.Shape();
      shape.moveTo(r,r);shape.lineTo(w-r,r);shape.lineTo(w-r,h-r);shape.lineTo(r,h-r);shape.closePath();
      var geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3});
      var mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z+r);
      mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
    }
    softBoard(dresser,0,0,0,.022,.805,.43,dresserWood);
    softBoard(dresser,.478,0,0,.022,.805,.43,dresserWood);
    box(dresser,.022,.025,.006,.456,.703,.014,dresserWood);
    softBoard(dresser,.022,.736,.105,.456,.024,.32,dresserWood);
    // Shallow full-width drawer; the stool tucks into the clear space below it.
    box(dresser,.026,.612,.09,.448,.122,.325,dresserWood);
    softBoard(dresser,.026,.617,.414,.448,.111,.016,dresserWood);
    box(dresser,.031,.731,.416,.438,.007,.012,dresserCream);
    box(dresser,.022,.748,.018,.456,.016,.087,dresserWood);
    softBoard(dresser,.015,.768,.003,.47,.037,.016,dresserWood);
    box(dresser,.024,.764,.096,.452,.018,.012,dresserWood);
    [.14,.31].forEach(function(x){box(dresser,x,.764,.02,.008,.025,.076,dresserWood);});
    // Recessed power panel in the rear tray.
    box(dresser,.335,.766,.032,.112,.005,.044,M.gap);
    [.36,.405].forEach(function(x){box(dresser,x,.772,.043,.003,.001,.014,dresserCream);box(dresser,x+.012,.772,.043,.003,.001,.014,dresserCream);});

    var stool=part(dresser,.033,0,.15);stool.name='master-dresser-storage-stool';
    carcass(stool,.434,.398,.37,dresserWood);
    box(stool,.023,.011,.024,.388,.373,.333,M.gap);
    function stoolDrawer(y,h,material) {
      var shape=new THREE.Shape();shape.moveTo(.008,y);shape.lineTo(.426,y);shape.lineTo(.426,y+h);shape.lineTo(.008,y+h);shape.closePath();
      var hole=new THREE.Path();hole.absarc(.217,y+h-.042,.012,0,Math.PI*2,true);shape.holes.push(hole);
      var mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.017,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,curveSegments:24}),material);
      mesh.position.z=.366;mesh.castShadow=true;mesh.receiveShadow=true;stool.add(mesh);
    }
    stoolDrawer(.018,.181,dresserPale);stoolDrawer(.204,.181,dresserCream);
    softBoard(stool,-.006,.398,-.003,.446,.043,.385,dresserCushion,.012);

    function dresserRod(a,b,r) {
      var start=new THREE.Vector3().fromArray(a),end=new THREE.Vector3().fromArray(b),axis=end.clone().sub(start);
      var mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,axis.length(),16),dresserChrome);
      mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
      mesh.castShadow=true;dresser.add(mesh);
    }
    dresserRod([.36,.78,.049],[.36,.85,.049],.007);
    dresserRod([.36,.85,.049],[.19,.89,.13],.006);
    dresserRod([.19,.89,.13],[.25,.935,.055],.006);
    dresserRod([.25,.935,.055],[.25,1.08,.055],.005);
    var mirrorBack=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.014,64),dresserChrome);
    mirrorBack.rotation.x=Math.PI/2;mirrorBack.position.set(.25,1.102,.07);dresser.add(mirrorBack);
    var dresserMirror=new THREE.Mesh(new THREE.CircleGeometry(.130,64),new THREE.MeshBasicMaterial({color:0xdce6e9,combine:THREE.MixOperation,reflectivity:.94}));
    dresserMirror.name='master-dresser-mirror';dresserMirror.position.set(.25,1.102,.078);dresser.add(dresserMirror);
    var mirrorRim=new THREE.Mesh(new THREE.TorusGeometry(.136,.004,10,64),dresserChrome);
    mirrorRim.position.set(.25,1.102,.080);dresser.add(mirrorRim);

    // Backed by the south wall: cabinet fronts face north into the dining area.
    var vanity=assembly('washbasin-cabinet','洗漱台与镜子','客餐厅',5.946,.27,3.545,Math.PI);
    carcass(vanity,.67,.55,.50,M.white,true);
    face(vanity,0,.012,.335,.528,.50,M.white,false);face(vanity,.335,.012,.335,.528,.50,M.white,false);
    box(vanity,.018,.34,.012,.634,.018,.46,M.inner);
    box(vanity,.018,.536,.482,.634,.012,.015,M.gap);
    var ceramic=mat('洗漱台白色陶瓷',0xf0f1ee,.20);
    var chrome=mat('洗漱台镀铬五金',0xd1d5d7,.18);chrome.metalness=1;chrome.envMap=steelEnvironment.texture;
    // Rounded rings form a recessed bowl rather than covering it with a flat top.
    function roundedRing(w,d,r,cx,cz) {
      var points=[],corners=[[w/2-r,d/2-r],[-w/2+r,d/2-r],[-w/2+r,-d/2+r],[w/2-r,-d/2+r]];
      corners.forEach(function(c,i){for(var j=0;j<=8;j++){
        var a=(i+j/8)*Math.PI/2;points.push([cx+c[0]+r*Math.cos(a),cz+c[1]+r*Math.sin(a)]);
      }});return points;
    }
    var basinRings=[
      {w:.67,d:.52,r:.035,y:.60,z:.26},
      {w:.46,d:.31,r:.055,y:.60,z:.30},
      {w:.29,d:.17,r:.05,y:.445,z:.30}
    ],positions=[],indices=[];
    basinRings.forEach(function(r){roundedRing(r.w,r.d,r.r,.335,r.z).forEach(function(p){positions.push(p[0],r.y,p[1]);});});
    var ringSize=positions.length/9;
    for(var br=0;br<2;br++) for(var bi=0;bi<ringSize;bi++) {
      var a=br*ringSize+bi,b=br*ringSize+(bi+1)%ringSize,c=a+ringSize,d=b+ringSize;
      indices.push(a,c,b,b,c,d);
    }
    var center=positions.length/3;positions.push(.335,.445,.30);
    for(var bf=0;bf<ringSize;bf++) indices.push(2*ringSize+bf,center,2*ringSize+(bf+1)%ringSize);
    var basinGeometry=new THREE.BufferGeometry();basinGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    basinGeometry.setIndex(indices);basinGeometry.computeVertexNormals();
    var basin=new THREE.Mesh(basinGeometry,ceramic);basin.name='washbasin-bowl';
    basin.castShadow=true;basin.receiveShadow=true;vanity.add(basin);
    box(vanity,.018,.565,.502,.634,.035,.018,ceramic);
    box(vanity,0,.565,.035,.018,.035,.467,ceramic);box(vanity,.652,.565,.035,.018,.035,.467,ceramic);
    box(vanity,0,.60,0,.67,.023,.018,ceramic);
    function cylinder(g,x,y,z,r,h,material) {
      var m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),material);m.position.set(x,y+h/2,z);
      m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    }
    cylinder(vanity,.335,.446,.30,.022,.003,chrome).name='washbasin-drain';
    var tap=new THREE.Group();tap.name='washbasin-faucet';vanity.add(tap);
    cylinder(tap,.335,.60,.065,.023,.145,chrome);
    box(tap,.315,.71,.065,.04,.026,.115,chrome);
    box(tap,.318,.754,.044,.034,.012,.075,chrome);
    var vanityUpper=assembly('washbasin-upper','洗手区顶柜','客餐厅',5.946,2.12,3.545,Math.PI);
    upper(vanityUpper,.67,.55,.64);

    function mirrorOutline(w,h,r) {
      var shape=new THREE.Shape();roundedRing(w,h,r,0,0).forEach(function(p,i){if(i)shape.lineTo(p[0],p[1]);else shape.moveTo(p[0],p[1]);});
      shape.closePath();return new THREE.ShapeGeometry(shape);
    }
    var mirrorTarget=new THREE.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
    mirrorTarget.texture.encoding=THREE.sRGBEncoding;
    var mirrorCamera=new THREE.CubeCamera(.025,40,mirrorTarget);
    var dresserMirrorTarget=new THREE.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
    dresserMirrorTarget.texture.encoding=THREE.sRGBEncoding;
    var dresserMirrorCamera=new THREE.CubeCamera(.025,40,dresserMirrorTarget);
    dresserMirror.material.envMap=dresserMirrorTarget.texture;
    var mirrorGlow=new THREE.Mesh(mirrorOutline(.626,.746,.048),new THREE.MeshBasicMaterial({color:0xc6e5ed}));
    mirrorGlow.position.set(.335,1.29,.024);vanity.add(mirrorGlow);
    var mirror=new THREE.Mesh(mirrorOutline(.61,.73,.044),new THREE.MeshBasicMaterial({color:0xdce6e9,envMap:mirrorTarget.texture,combine:THREE.MixOperation,reflectivity:.94}));
    mirror.name='washbasin-mirror';mirror.position.set(.335,1.29,.028);vanity.add(mirror);
    // Capture the room when its geometry changes; camera orbit reuses the cubemap.
    function refreshMirror(scene) {
      if(!root.visible) return;
      scene.updateMatrixWorld(true);mirror.getWorldPosition(mirrorCamera.position);
      mirrorCamera.position.add(new THREE.Vector3(0,0,.03).transformDirection(mirror.matrixWorld).multiplyScalar(.03));
      mirror.visible=false;mirrorGlow.visible=false;
      try {mirrorCamera.update(renderer,scene);} finally {mirror.visible=true;mirrorGlow.visible=true;}
      dresserMirror.getWorldPosition(dresserMirrorCamera.position);
      dresserMirrorCamera.position.add(new THREE.Vector3(0,0,1).transformDirection(dresserMirror.matrixWorld).multiplyScalar(.03));
      dresserMirror.visible=false;
      try {dresserMirrorCamera.update(renderer,scene);} finally {dresserMirror.visible=true;}
    }

    root.updateMatrixWorld(true);
    root.children.forEach(function(g) {
      var b=new THREE.Box3().setFromObject(g);
      g.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};
    });
    return {root:root,refreshMirror:refreshMirror,counterMaterial:M.counter,sinkMount:sinkMount};
  }
  global.CABINETS={build:build};
})(window);
