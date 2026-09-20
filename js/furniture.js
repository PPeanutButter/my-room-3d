/* Photo-referenced movable furniture. Plan coordinates and estimated sizes are metres. */
(function(global) {
  'use strict';
  function build(renderer) {
    var root=new THREE.Group();root.name='beds-and-sofas';
    function clothTexture(quilted) {
      var canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      var ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256),seed=81;
      for(var y=0;y<256;y++) for(var x=0;x<256;x++) {
        seed=(Math.imul(seed,1664525)+1013904223)|0;
        var v=237+(seed>>>0)/4294967296*9+((x%4<2)===(y%4<2)?2:-2),i=(y*256+x)*4;
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      if(quilted) {
        ctx.strokeStyle='rgba(155,150,140,.18)';ctx.lineWidth=1.3;
        for(var q=-256;q<=512;q+=64) {
          ctx.beginPath();ctx.moveTo(q,0);ctx.lineTo(q+256,256);ctx.stroke();
          ctx.beginPath();ctx.moveTo(q,0);ctx.lineTo(q-256,256);ctx.stroke();
        }
      }
      var t=new THREE.CanvasTexture(canvas);t.encoding=THREE.sRGBEncoding;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(quilted?1.4:5,quilted?1.4:5);
      t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
    }
    var fabric=clothTexture(false),quilting=clothTexture(true);
    function material(name,color,roughness,map) {
      var m=new THREE.MeshStandardMaterial({name:name,color:color,roughness:roughness,map:map||null});
      m.color.convertSRGBToLinear();
      if(map) {m.bumpMap=map;m.bumpScale=map===quilting?.0012:.0006;}
      return m;
    }
    var M={
      sofa:material('客厅米色织物',0xb3a393,.91,fabric),
      green:material('次卧深绿织物',0x424d40,.94,fabric),
      pillow:material('米白织物靠枕',0xd7cdbb,.96,fabric),
      greenPillow:material('次卧灰绿靠垫',0x647060,.94,fabric),
      frame:material('主卧灰色软包床框',0x777a77,.91,fabric),
      mattress:material('米白菱格床垫',0xeeeae0,.96,quilting),
      bedding:material('浅色枕头',0xe9e4d8,.98,fabric),
      table:material('餐桌奶白烤漆',0xdedcd0,.43),
      chair:material('餐椅暖木色',0x9e7047,.58),
      foot:material('深灰家具脚',0x373a36,.65),
      slat:material('床架木排骨条',0xa78359,.85)
    };
    // Project edge samples onto a rounded box, retaining straight upholstered faces.
    function rounded(g,x,y,z,w,h,d,r,mat) {
      r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);
      var geom=new THREE.BoxGeometry(1,1,1,8,8,8),p=geom.attributes.position,n=geom.attributes.normal,uv=geom.attributes.uv;
      var half=new THREE.Vector3(w/2,h/2,d/2),core=half.clone().addScalar(-r);
      function sample(v,extent) {
        var t=Math.abs(v),a=extent-r;
        return Math.sign(v)*(t<=.25?t*4*a:a+(t-.25)*4*r);
      }
      for(var i=0;i<p.count;i++) {
        var v=new THREE.Vector3(sample(p.getX(i),half.x),sample(p.getY(i),half.y),sample(p.getZ(i),half.z));
        var c=v.clone().clamp(core.clone().negate(),core),normal=v.clone().sub(c).normalize();
        v.copy(c).addScaledVector(normal,r);
        if(Math.abs(n.getY(i))>.5) uv.setXY(i,v.x+w/2,v.z+d/2);
        else uv.setXY(i,Math.abs(n.getX(i))>.5?v.z+d/2:v.x+w/2,v.y+h/2);
        p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
      }
      var m=new THREE.Mesh(geom,mat);m.position.set(x+w/2,y+h/2,z+d/2);
      m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    }
    function box(g,x,y,z,w,h,d,mat) {
      var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x+w/2,y+h/2,z+d/2);
      m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    }
    function assembly(name,label,room,x,z,angle) {
      var g=new THREE.Group();g.name=name;g.userData={kind:'furniture',label:label,room:room};
      g.position.set(x,0,z);g.rotation.y=angle||0;root.add(g);return g;
    }
    function legs(g,w,d,h) {
      [[.10,.10],[w-.14,.10],[.10,d-.14],[w-.14,d-.14]].forEach(function(p){
        box(g,p[0],0,p[1],.04,h,.04,M.foot);
      });
    }
    function pillow(g,x,y,z,w,h,d,mat,tilt) {
      var p=rounded(g,x,y,z,w,h,d,.065,mat);p.rotation.x=tilt||0;return p;
    }

    // Head against the east wall, foot toward the west-side aisle.
    // Reserve 50 cm beside the wardrobe and 5 cm between the bed and dresser.
    var bed=assembly('master-bed','主卧双人床','主卧',7.82,4.777,-Math.PI/2),bw=1.86,bl=2.10;
    legs(bed,bw,bl,.18);
    rounded(bed,0,.16,0,.05,.22,bl,.022,M.frame);
    rounded(bed,bw-.05,.16,0,.05,.22,bl,.022,M.frame);
    rounded(bed,0,.16,bl-.055,bw,.22,.055,.024,M.frame);
    var headboard=new THREE.Group();headboard.name='master-upholstered-headboard';bed.add(headboard);
    rounded(headboard,0,.16,0,bw,.92,.065,.028,M.frame);
    // Two padded backrests sit above the mattress, with a narrow centre seam.
    rounded(headboard,.035,.575,.04,.888,.465,.10,.047,M.frame);
    rounded(headboard,.937,.575,.04,.888,.465,.10,.047,M.frame);
    box(bed,bw/2-.025,.23,.06,.05,.05,bl-.12,M.frame);
    for(var s=0;s<13;s++) box(bed,.05,.295,.075+s*.151,bw-.10,.024,.095,M.slat);
    rounded(bed,.03,.32,.07,1.80,.24,2.00,.032,M.mattress).name='master-mattress';
    // Flat mattress represents the normal use state, rather than the packing photo.
    pillow(bed,.12,.557,.15,.72,.12,.38,M.bedding);
    pillow(bed,1.02,.557,.15,.72,.12,.38,M.bedding);

    function sofa(g,w,d,mat,seatCount) {
      legs(g,w,d,.105);
      rounded(g,0,.09,0,w,.23,d,.045,mat);
      rounded(g,.10,.28,.01,w-.20,.52,.19,.055,mat);
      rounded(g,0,.21,.04,.16,.39,d-.04,.06,mat);
      rounded(g,w-.16,.21,.04,.16,.39,d-.04,.06,mat);
      var pitch=(w-.35)/seatCount;
      for(var i=0;i<seatCount;i++) {
        var x=.175+i*pitch;
        rounded(g,x,.315,.245,pitch-.016,.145,d-.285,.045,mat);
        var back=rounded(g,x,.445,.115,pitch-.02,.43,.18,.055,mat);back.rotation.x=-.10;
      }
    }
    // West living-room wall; sofa faces the existing television cabinet.
    var living=assembly('living-sofa','客厅三人沙发','客餐厅',1.69,7.05,Math.PI/2);
    sofa(living,2.60,.91,M.sofa,3);
    pillow(living,.24,.48,.30,.36,.34,.13,M.pillow,-.14);
    pillow(living,1.83,.48,.32,.38,.35,.13,M.pillow,-.18);

    // Folded sofa bed backs onto the west wall and faces the east-side wardrobe.
    var guest=assembly('bed2-sofa-bed','次卧沙发床（收拢）','次卧',.30,1.66,Math.PI/2);
    sofa(guest,1.36,.88,M.green,2);
    pillow(guest,.24,.465,.29,.40,.32,.12,M.greenPillow,-.15);

    function rod(g,a,b,r1,r2,mat) {
      var start=new THREE.Vector3().fromArray(a),end=new THREE.Vector3().fromArray(b),axis=end.clone().sub(start);
      var mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,axis.length(),16),mat);
      mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
      mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
    }
    // Flat end toward the west wall, semicircular end toward the kitchen aisle.
    var table=assembly('dining-table','奶白圆弧餐桌','客餐厅',3.04,1.55,0);
    var topShape=new THREE.Shape();
    topShape.moveTo(.035,0);topShape.lineTo(1,0);
    topShape.absarc(1,-.38,.38,Math.PI/2,-Math.PI/2,true);
    topShape.lineTo(.035,-.76);topShape.quadraticCurveTo(0,-.76,0,-.725);
    topShape.lineTo(0,-.035);topShape.quadraticCurveTo(0,0,.035,0);topShape.closePath();
    var tabletopGeometry=new THREE.ExtrudeGeometry(topShape,{depth:.024,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:3,curveSegments:24});
    tabletopGeometry.rotateX(-Math.PI/2);tabletopGeometry.translate(0,.732,0);
    var tabletop=new THREE.Mesh(tabletopGeometry,M.table);tabletop.name='dining-tabletop';
    tabletop.castShadow=true;tabletop.receiveShadow=true;table.add(tabletop);
    [[.10,.12],[1.14,.15],[.10,.64],[1.14,.61]].forEach(function(p){rod(table,[p[0],0,p[1]],[p[0],.73,p[1]],.019,.026,M.table);});
    box(table,.10,.668,.12,1.04,.055,.027,M.table);
    box(table,.10,.668,.613,1.04,.055,.027,M.table);
    box(table,.10,.668,.12,.027,.055,.52,M.table);
    box(table,1.12,.668,.15,.027,.055,.46,M.table);

    function diningChair(name,x,z,rotation) {
      var chair=assembly(name,'木色餐椅','客餐厅',x,z,rotation);
      [-1,1].forEach(function(side){
        rod(chair,[side*.215,0,-.20],[side*.175,.45,-.145],.017,.021,M.chair);
        rod(chair,[side*.21,0,.215],[side*.175,.77,.17],.018,.020,M.chair);
        rod(chair,[side*.195,.21,-.175],[side*.195,.21,.20],.012,.012,M.chair);
      });
      rounded(chair,-.215,.432,-.205,.43,.035,.41,.016,M.chair);
      // Curved back rail and central Y support echo the wooden chairs in the photos.
      var backCurve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.24,.80,.105),new THREE.Vector3(-.175,.80,.205),
        new THREE.Vector3(0,.78,.245),new THREE.Vector3(.175,.80,.205),new THREE.Vector3(.24,.80,.105)
      ]);
      var rail=new THREE.Mesh(new THREE.TubeGeometry(backCurve,32,.024,10,false),M.chair);
      rail.castShadow=true;rail.receiveShadow=true;chair.add(rail);
      rod(chair,[0,.47,.17],[0,.68,.21],.014,.017,M.chair);
      rod(chair,[0,.66,.21],[-.10,.785,.23],.014,.018,M.chair);
      rod(chair,[0,.66,.21],[.10,.785,.23],.014,.018,M.chair);
      return chair;
    }
    diningChair('dining-chair-south',3.73,2.59,0);
    diningChair('dining-chair-north',3.73,1.26,Math.PI);

    root.updateMatrixWorld(true);
    root.children.forEach(function(g){var b=new THREE.Box3().setFromObject(g);g.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};});
    return {root:root};
  }
  global.FURNITURE={build:build};
})(window);
