/* Photo-referenced appliances and plumbing fixtures. Unmarked sizes are estimates. */
(function(global) {
  'use strict';
  function build(renderer,cabinets) {
    var root=new THREE.Group();root.name='appliances-and-fixtures';
    function material(name,color,roughness,metalness) {
      var m=new THREE.MeshStandardMaterial({name:name,color:color,roughness:roughness,metalness:metalness||0});
      m.color.convertSRGBToLinear();
      if(metalness) m.envMap=cabinets.counterMaterial.envMap;
      return m;
    }
    var M={
      white:material('家电暖白外壳',0xe3e4df,.36),
      ceramic:material('卫浴白色陶瓷',0xf0f1eb,.20),
      silver:material('拉丝银色金属',0xa9b0b3,.45,1),
      chrome:material('镀铬管件',0xd4dadc,.19,1),
      steel:cabinets.counterMaterial,
      black:material('黑色家电面板',0x181d20,.23),
      rubber:material('黑色密封胶与炉架',0x282c2b,.9),
      dark:material('深灰金属外壳',0x646c70,.48,.65),
      inset:material('家电凹槽',0x838b8c,.68),
      yellow:material('燃气黄色软管',0xc8a43b,.8),
      blue:material('冷水阀标记',0x518199,.64),
      red:material('热水阀标记',0xaa675b,.64)
    };
    function add(g,geometry,mat,x,y,z) {
      var mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x||0,y||0,z||0);
      mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
    }
    function box(g,x,y,z,w,h,d,mat) {return add(g,new THREE.BoxGeometry(w,h,d),mat,x+w/2,y+h/2,z+d/2);}
    function outline(w,h,r,x,y,path) {
      path=path||new THREE.Shape();x=x||0;y=y||0;
      path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);
      path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);
      path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);path.closePath();return path;
    }
    function rounded(g,x,y,z,w,h,d,mat,r) {
      var e=Math.min(.007,w/8,h/8,d/4),radius=Math.min(r||.025,(w-2*e)/2,(h-2*e)/2);
      var shape=outline(w-2*e,h-2*e,radius,e,e);
      return add(g,new THREE.ExtrudeGeometry(shape,{depth:d-2*e,bevelEnabled:true,bevelSize:e,bevelThickness:e,bevelSegments:2,curveSegments:8}),mat,x,y,z+e);
    }
    function group(name,label,room,x,y,z,angle) {
      var g=new THREE.Group();g.name=name;g.userData={kind:'appliance',label:label,room:room};
      g.position.set(x,y,z);g.rotation.y=angle||0;root.add(g);return g;
    }
    function rod(g,a,b,r,mat) {
      var p=new THREE.Vector3().fromArray(a),q=new THREE.Vector3().fromArray(b),axis=q.clone().sub(p);
      var m=add(g,new THREE.CylinderGeometry(r,r,axis.length(),16),mat);
      m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());return m;
    }
    function pipe(g,points,r,mat) {
      return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(function(p){return new THREE.Vector3().fromArray(p);})),32,r,10,false),mat);
    }
    function disc(g,x,y,z,r,h,mat,vertical) {
      var m=add(g,new THREE.CylinderGeometry(r,r,h,32),mat,x,y,z);if(vertical)m.rotation.x=Math.PI/2;return m;
    }
    function ring(g,x,y,z,r,t,mat,horizontal) {
      var m=add(g,new THREE.TorusGeometry(r,t,10,48),mat,x,y,z);if(horizontal)m.rotation.x=Math.PI/2;return m;
    }
    function bowl(g,name,cx,cz,rings,mat,ellipse) {
      var verts=[],indices=[],count=64;
      rings.forEach(function(r){for(var i=0;i<count;i++) {
        var a=2*Math.PI*i/count,c=Math.cos(a),s=Math.sin(a);
        // Superellipse corners approximate rectangular pressed-steel sink bowls.
        var power=ellipse?1:.32;
        verts.push(cx+r.w/2*Math.sign(c)*Math.pow(Math.abs(c),power),r.y,cz+r.d/2*Math.sign(s)*Math.pow(Math.abs(s),power));
      }});
      for(var k=0;k<rings.length-1;k++)for(var j=0;j<count;j++) {
        var a=k*count+j,b=k*count+(j+1)%count,c=a+count,d=b+count;indices.push(a,c,b,b,c,d);
      }
      var center=verts.length/3;verts.push(cx,rings[rings.length-1].y,cz);
      for(var f=0;f<count;f++)indices.push((rings.length-1)*count+f,center,(rings.length-1)*count+(f+1)%count);
      var uvs=[];for(var u=0;u<verts.length;u+=3)uvs.push(verts[u],verts[u+2]);
      var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
      var mesh=add(g,geometry,mat);mesh.name=name;return mesh;
    }

    var hob=group('kitchen-hob','厨房双眼燃气灶','厨房',7.375,.82,.355);
    rounded(hob,0,.004,0,.69,.022,.43,M.black,.035);
    [.17,.52].forEach(function(x){
      disc(hob,x,.039,.21,.061,.025,M.dark);disc(hob,x,.056,.21,.046,.013,M.rubber);
      ring(hob,x,.055,.21,.10,.006,M.rubber,true);
      for(var i=0;i<4;i++) {
        var a=i*Math.PI/2;
        rod(hob,[x+Math.cos(a)*.063,.069,.21+Math.sin(a)*.063],[x+Math.cos(a)*.12,.069,.21+Math.sin(a)*.12],.007,M.rubber);
      }
      disc(hob,x,.037,.368,.019,.026,M.dark);
    });

    var hood=group('kitchen-range-hood','厨房侧吸油烟机','厨房',7.375,1.49,.27);
    rounded(hood,.07,.28,0,.55,.37,.12,M.dark,.018);
    box(hood,.225,.53,.014,.24,.17,.09,M.dark);
    var panel=rounded(hood,0,.10,.09,.69,.44,.042,M.black,.03);
    // Rotate about the panel centre, top toward the room as in the slanted hood photo.
    panel.geometry.translate(-.345,-.22,-.014);
    panel.position.set(.345,.33,.245);panel.rotation.x=.42;
    rounded(hood,0,.527,.03,.69,.058,.32,M.dark,.014);
    for(var hb=0;hb<4;hb++)disc(hood,.46+hb*.045,.553,.356,.006,.002,M.silver,true);
    box(hood,.095,.105,.14,.50,.014,.025,M.rubber);

    var mount=cabinets.sinkMount;
    var sink=group('kitchen-sink','厨房不锈钢洗菜盆','厨房',mount.position[0],0,mount.position[2],mount.rotation);
    bowl(sink,'kitchen-sink-bowl',mount.x,mount.z,[
      {w:mount.width+.055,d:mount.depth+.055,y:mount.top+.008},
      {w:mount.width-.010,d:mount.depth-.010,y:mount.top+.008},
      {w:mount.width-.075,d:mount.depth-.075,y:mount.top-.17}
    ],M.steel,false);
    disc(sink,mount.x,mount.top-.168,mount.z,.032,.003,M.chrome);
    for(var dh=0;dh<6;dh++)disc(sink,mount.x+Math.cos(dh*Math.PI/3)*.019,mount.top-.165,mount.z+Math.sin(dh*Math.PI/3)*.019,.003,.002,M.rubber);
    pipe(sink,[[mount.x,.907,.055],[mount.x,1.14,.055],[mount.x,1.19,.12],[mount.x,1.15,.205]],.012,M.chrome);
    disc(sink,mount.x,.925,.055,.023,.038,M.chrome);
    rod(sink,[mount.x+.025,.94,.055],[mount.x+.07,.99,.055],.008,M.chrome);

    // East wall of the service balcony; keep the south window and passage clear.
    var heater=group('service-water-heater','燃气热水器','厨房小阳台',9.175,0,2.12,-Math.PI/2);
    rounded(heater,0,1.44,0,.36,.58,.19,M.silver,.023);
    rounded(heater,.055,1.65,.192,.25,.18,.008,M.dark,.012);
    box(heater,.14,1.735,.202,.08,.025,.003,M.black);
    disc(heater,.10,1.70,.205,.015,.005,M.black,true);disc(heater,.26,1.70,.205,.015,.005,M.black,true);
    pipe(heater,[[.18,2.02,.075],[.18,2.29,.075],[.18,2.37,.035],[.18,2.37,.004]],.035,M.silver);
    [.08,.28].forEach(function(x,i){
      pipe(heater,[[x,1.44,.08],[x,1.30,.10],[x,1.26,.028],[x,.97,.028]],.009,M.chrome);
      box(heater,x-.024,1.19,.028,.048,.018,.016,i?M.red:M.blue);
    });
    pipe(heater,[[.18,1.44,.095],[.18,1.29,.115],[.09,1.22,.09],[.09,.77,.04],[.18,.66,.04]],.009,M.yellow);
    rounded(heater,.05,.42,.008,.22,.24,.115,M.inset,.014);
    box(heater,.086,.56,.125,.14,.046,.005,M.black);

    var shower=group('bath-shower','卫生间淋浴','卫生间',6.57,-.018,1.915);
    rod(shower,[0,1.03,.065],[0,2.08,.065],.012,M.dark);
    pipe(shower,[[0,2.02,.065],[0,2.17,.065],[0,2.20,.18],[0,2.20,.34]],.011,M.dark);
    rounded(shower,-.14,2.16,.20,.28,.027,.23,M.black,.045);
    rod(shower,[-.14,1.03,.065],[.14,1.03,.065],.023,M.dark);
    rod(shower,[-.075,1.52,.085],[-.055,1.66,.155],.016,M.dark);
    var hand=disc(shower,-.055,1.69,.174,.046,.025,M.dark,true);hand.rotation.x=.9;
    pipe(shower,[[.08,1.02,.08],[.17,.63,.16],[-.07,.65,.16],[-.08,1.05,.14],[-.075,1.52,.085]],.007,M.rubber);
    box(shower,-.055,.003,.44,.11,.006,.11,M.silver);
    for(var sl=0;sl<5;sl++)box(shower,-.041+sl*.019,.010,.451,.007,.001,.086,M.rubber);

    var toilet=group('bath-toilet','卫生间马桶','卫生间',7.21,-.018,3.405,Math.PI);
    rounded(toilet,-.165,0,.14,.33,.20,.43,M.ceramic,.085);
    // Outer bowl shell, hollow basin and a separate open seat ring.
    var shellPoints=[new THREE.Vector2(.12,.12),new THREE.Vector2(.17,.24),new THREE.Vector2(.215,.36),new THREE.Vector2(.205,.40)];
    var toiletShell=add(toilet,new THREE.LatheGeometry(shellPoints,48),M.ceramic,0,0,.39);toiletShell.scale.z=1.30;
    bowl(toilet,'toilet-bowl',0,.39,[{w:.41,d:.54,y:.405},{w:.29,d:.39,y:.405},{w:.16,d:.19,y:.245}],M.ceramic,true);
    var seatShape=new THREE.Shape();seatShape.absellipse(0,0,.211,.278,0,Math.PI*2,false,0);
    var seatHole=new THREE.Path();seatHole.absellipse(0,0,.149,.201,0,Math.PI*2,true,0);seatShape.holes.push(seatHole);
    var seatGeometry=new THREE.ExtrudeGeometry(seatShape,{depth:.018,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:32});
    seatGeometry.rotateX(-Math.PI/2);add(toilet,seatGeometry,M.ceramic,0,.414,.39);
    rounded(toilet,-.19,.28,0,.38,.43,.15,M.ceramic,.05);
    rounded(toilet,-.192,.71,-.002,.384,.025,.154,M.ceramic,.05);
    disc(toilet,0,.738,.065,.028,.006,M.chrome);
    rounded(toilet,-.188,.465,.153,.376,.43,.025,M.ceramic,.10);

    var fridge=group('living-fridge','沙发旁冰箱','客餐厅',1.68,0,4.38,Math.PI/2);
    rounded(fridge,0,.025,0,.64,1.805,.63,M.white,.025);
    box(fridge,.035,0,.025,.57,.045,.56,M.dark);
    [.014,.323].forEach(function(x){rounded(fridge,x,.70,.63,.303,1.10,.034,M.white,.01);});
    rounded(fridge,.014,.37,.63,.612,.318,.034,M.white,.01);
    rounded(fridge,.014,.056,.63,.612,.301,.034,M.white,.01);
    box(fridge,.305,.88,.666,.027,.56,.008,M.rubber);
    box(fridge,.05,.658,.665,.54,.012,.006,M.inset);box(fridge,.05,.328,.665,.54,.012,.006,M.inset);

    // Rounded cabinet with its tall outlet cover closed, angled into the living room.
    var tower=group('living-air-conditioner','客厅立式空调','客餐厅',4.88,0,7.21,-Math.PI*.75);
    function towerShell(w,d,h,y,r,mat) {
      var e=.006,shape=outline(w-2*e,d-2*e,r,-w/2+e,-d/2+e);
      var geometry=new THREE.ExtrudeGeometry(shape,{depth:h-2*e,bevelEnabled:true,bevelSize:e,bevelThickness:e,bevelSegments:3,curveSegments:16});
      geometry.rotateX(-Math.PI/2);geometry.translate(0,y+e,0);
      return add(tower,geometry,mat);
    }
    towerShell(.37,.32,.035,0,.095,M.silver);
    towerShell(.355,.305,1.765,.035,.095,M.white);
    rounded(tower,-.105,.355,.151,.21,1.205,.010,M.silver,.027);
    rounded(tower,-.098,.363,.160,.196,1.189,.006,M.white,.023);
    // Small upper status indicators and the recessed top vent match the photo.
    for(var indicator=0;indicator<5;indicator++)disc(tower,-.055+indicator*.027,1.67,.154,.0025,.002,M.inset,true);
    disc(tower,0,1.64,.154,.008,.002,M.inset,true);
    rounded(tower,-.07,1.774,.064,.14,.012,.051,M.black,.005);

    function wallAC(id,label,room,x,z,rotation,width) {
      var ac=group(id,label,room,x,2.19,z,rotation);
      rounded(ac,0,0,0,width,.285,.205,M.white,.043);
      rounded(ac,.038,.028,.204,width-.076,.031,.009,M.inset,.01);
      box(ac,.044,.017,.201,width-.088,.012,.025,M.white);
      disc(ac,width-.075,.105,.211,.017,.004,M.black,true);
      for(var i=0;i<9;i++)box(ac,.045+i*(width-.09)/9,.271,.045,.038,.005,.105,M.inset);
      pipe(ac,[[width-.04,.02,.025],[width+.022,-.06,.027],[width+.022,-.14,.014]],.016,M.white);
    }
    // On the window wall, to the right when looking toward the window from the door.
    wallAC('master-air-conditioner','主卧壁挂空调','主卧',6.16,7.428,Math.PI,.78);
    wallAC('bed2-air-conditioner','次卧壁挂空调','次卧',.257,3.34,Math.PI/2,.73);

    var washer=group('balcony-washer','阳台滚筒洗衣机','阳台',5.065,-.018,8.00,-Math.PI/2);
    rounded(washer,0,.025,0,.60,.825,.57,M.dark,.018);
    [[.06,.07],[.54,.07],[.06,.50],[.54,.50]].forEach(function(p){rod(washer,[p[0],0,p[1]],[p[0],.035,p[1]],.021,M.rubber);});
    rounded(washer,.02,.69,.57,.56,.14,.012,M.silver,.008);
    box(washer,.042,.73,.584,.16,.04,.003,M.dark);box(washer,.377,.734,.584,.165,.046,.003,M.black);
    disc(washer,.297,.76,.594,.030,.023,M.chrome,true);
    disc(washer,.30,.395,.577,.211,.020,M.rubber,true);
    ring(washer,.30,.395,.596,.181,.024,M.black,false);
    disc(washer,.30,.395,.592,.155,.007,M.inset,true);
    disc(washer,.30,.395,.602,.132,.005,M.black,true);
    ring(washer,.30,.395,.607,.14,.004,M.silver,false);
    rounded(washer,.458,.365,.59,.029,.095,.030,M.dark,.012);
    for(var dv=0;dv<4;dv++)box(washer,.065+dv*.12,.087,.572,.07,.012,.003,M.inset);

    var rack=group('balcony-drying-rack','阳台双杆晾衣架','阳台',2.02,0,7.98);
    [.09,.62].forEach(function(z){
      var bar=outline(2.65,.038,.010);
      for(var h=0;h<19;h++){var hole=new THREE.Path();hole.absarc(.10+h*.136,.019,.009,0,Math.PI*2,true);bar.holes.push(hole);}
      add(rack,new THREE.ExtrudeGeometry(bar,{depth:.020,bevelEnabled:false,curveSegments:8}),M.silver,0,2.12,z);
      [.16,2.49].forEach(function(x){
        rod(rack,[x,2.16,z+.01],[x,2.60,z+.01],.002,M.chrome);
        disc(rack,x,2.612,z+.01,.035,.024,M.white);
      });
    });
    [.16,2.49].forEach(function(x){rod(rack,[x,2.105,.10],[x,2.105,.63],.009,M.silver);});

    root.updateMatrixWorld(true);
    root.children.forEach(function(g){var b=new THREE.Box3().setFromObject(g);g.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};});
    return {root:root};
  }
  global.APPLIANCES={build:build};
})(window);
