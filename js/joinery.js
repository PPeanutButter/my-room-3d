/* Doors and windows in the existing openings. Local x runs along the wall.
 * These assemblies retain full height in the wall cutaway view.
 */
(function (global) {
  'use strict';
  function build(renderer,walls) {
    var root=new THREE.Group();root.name='doors-and-windows';
    var unitBox=new THREE.BoxGeometry(1,1,1),moving=[];
    var c=document.createElement('canvas');c.width=128;c.height=512;
    var ctx=c.getContext('2d');ctx.fillStyle='#eeeae3';ctx.fillRect(0,0,128,512);
    for(var i=0;i<128;i++) {
      var shade=Math.sin(i*.43)*.017+Math.sin(i*1.9)*.009+.025;
      ctx.fillStyle='rgba(111,91,69,'+shade+')';ctx.fillRect(i,0,1,512);
    }
    var grain=new THREE.CanvasTexture(c);grain.encoding=THREE.sRGBEncoding;
    grain.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    var frostCanvas=document.createElement('canvas');frostCanvas.width=frostCanvas.height=128;
    var frostCtx=frostCanvas.getContext('2d'),frostPixels=frostCtx.createImageData(128,128),seed=2026;
    for(var p=0;p<frostPixels.data.length;p+=4) {
      seed=(Math.imul(seed,1664525)+1013904223)|0;
      var v=234+(seed>>>0)/4294967296*16;
      frostPixels.data[p]=v;frostPixels.data[p+1]=v;frostPixels.data[p+2]=v;frostPixels.data[p+3]=255;
    }
    frostCtx.putImageData(frostPixels,0,0);
    var frostTexture=new THREE.CanvasTexture(frostCanvas);frostTexture.encoding=THREE.sRGBEncoding;
    frostTexture.wrapS=frostTexture.wrapT=THREE.RepeatWrapping;frostTexture.repeat.set(3,6);
    var meshCanvas=document.createElement('canvas');meshCanvas.width=meshCanvas.height=32;
    var meshCtx=meshCanvas.getContext('2d');
    meshCtx.fillStyle='rgba(45,51,49,.8)';meshCtx.fillRect(0,0,4,32);meshCtx.fillRect(0,0,32,4);
    var meshTexture=new THREE.CanvasTexture(meshCanvas);meshTexture.encoding=THREE.sRGBEncoding;
    meshTexture.wrapS=meshTexture.wrapT=THREE.RepeatWrapping;
    meshTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    function material(name,color,roughness,metalness) {
      var m=new THREE.MeshStandardMaterial({color:color,roughness:roughness,metalness:metalness||0});m.name=name;return m;
    }
    var M={
      frame:material('深灰铝合金',0x343c3c,.43,.45),
      gasket:material('黑色密封胶条',0x242826,.94),
      doorPaint:material('浅木色室内门',0xc5b29d,.62),
      doorTrim:material('浅木色门套',0xcbbba7,.6),
      entry:material('深棕入户门',0x59443a,.58),
      entryTrim:material('入户门框',0x493a32,.58),
      groove:material('门板细缝',0xa5937f,.85),
      hardware:material('黑色门锁与合页',0x242929,.34,.62),
      sill:material('浅色石材窗台',0xd9d7cf,.38),
      track:material('金属门轨',0x8a918d,.36,.65),
      glass:new THREE.MeshStandardMaterial({name:'透明玻璃',color:0xc7dee0,transparent:true,opacity:.15,roughness:.15,depthWrite:false}),
      frost:new THREE.MeshStandardMaterial({name:'卫浴磨砂玻璃',color:0x343a3a,map:frostTexture,bumpMap:frostTexture,bumpScale:.0015,transparent:true,opacity:.94,roughness:1,depthWrite:false}),
      screen:new THREE.MeshBasicMaterial({name:'外窗细密纱网',map:meshTexture,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})
    };
    M.doorPaint.map=grain;M.entry.map=grain;
    function box(g,x0,y0,z0,x1,y1,z1,mat) {
      if(x1-x0<.0001||y1-y0<.0001||z1-z0<.0001) return;
      var mesh=new THREE.Mesh(unitBox,mat);
      mesh.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);mesh.scale.set(x1-x0,y1-y0,z1-z0);
      mesh.castShadow=!mat.transparent;mesh.receiveShadow=!mat.transparent;g.add(mesh);return mesh;
    }
    function rim(g,x0,y0,x1,y1,z,depth,width,mat,bottom) {
      box(g,x0,y0,z-depth/2,x0+width,y1,z+depth/2,mat);
      box(g,x1-width,y0,z-depth/2,x1,y1,z+depth/2,mat);
      box(g,x0+width,y1-width,z-depth/2,x1-width,y1,z+depth/2,mat);
      if(bottom) box(g,x0+width,y0,z-depth/2,x1-width,y0+width,z+depth/2,mat);
    }
    function pane(g,x0,y0,x1,y1,z,frost) {
      box(g,x0,y0,z-.004,x1,y1,z+.004,frost?M.frost:M.glass);
    }
    function lever(g,x,y,z,sign) {
      box(g,x-.018,y-.095,z-.012,x+.018,y+.075,z+.012,M.hardware);
      box(g,x-.013,y-.014,z-.035,x+.013,y+.014,z+.035,M.hardware);
      var end=x+sign*.105;
      box(g,Math.min(x,end),y-.012,z-.045,Math.max(x,end),y+.012,z-.027,M.hardware);
    }
    function handle(g,x,y,z) {
      box(g,x-.012,y-.08,z-.018,x+.012,y+.08,z+.018,M.hardware);
    }
    function doorway(g,width,height,depth,kind) {
      var wood=kind==='wood'||kind==='entry',entry=kind==='entry';
      var trim=wood?(entry?M.entryTrim:M.doorTrim):M.frame;
      rim(g,0,0,width,height,0,depth+.008,wood?.036:.03,trim,false);
      // Front and rear architraves sit just outside the opening.
      if(wood) [-1,1].forEach(function(side) {
        rim(g,-.045,0,width+.045,height+.045,side*(depth/2+.011),.022,.065,trim,false);
      });
      box(g,.035,.001,-depth/2,width-.035,.014,depth/2,wood?M.sill:M.track);
    }
    function hinged(g,width,height,depth,o) {
      doorway(g,width,height,depth,o.door);
      var right=o.hinge==='end',dir=right?-1:1,clear=.043,leafW=width-clear*2;
      var pivot=new THREE.Group();pivot.position.set(right?width-clear:clear,0,0);g.add(pivot);
      pivot.name=o.id+'-hinge';pivot.userData.motion='hinge';
      var leaf=new THREE.Group();leaf.scale.x=dir;pivot.add(leaf);
      var bottom=.022,top=height-.044,thick=o.door==='entry'?.055:.038;
      if(o.door==='glass') {
        rim(leaf,0,bottom,leafW,top,0,thick,.032,M.frame,true);
        pane(leaf,.033,bottom+.034,leafW-.033,top-.034,0,true);
      } else {
        box(leaf,0,bottom,-thick/2,leafW,top,thick/2,o.door==='entry'?M.entry:M.doorPaint);
        [-1,1].forEach(function(side) {
          var z=side*(thick/2+.0015);
          if(o.door==='wood') {
            box(leaf,leafW*.73,.15,z-.001,leafW*.73+.003,top-.16,z+.001,M.groove);
            [.50,1.22].forEach(function(y){box(leaf,leafW*.73,y,z-.001,leafW-.07,y+.003,z+.001,M.groove);});
          } else {
            rim(leaf,.09,.15,leafW-.09,top-.14,z,.007,.012,M.entryTrim,true);
            box(leaf,leafW/2-.012,1.47,z-.007,leafW/2+.012,1.494,z+.007,M.hardware);
          }
        });
      }
      lever(leaf,leafW-.085,1.0,-thick/2-.026,-1);
      var rear=new THREE.Group();rear.rotation.y=Math.PI;rear.position.x=leafW;leaf.add(rear);
      lever(rear,.085,1.0,-thick/2-.026,1);
      [.28,1.12,top-.2].forEach(function(y){box(leaf,-.012,y-.045,-.025,.012,y+.045,.025,M.hardware);});
      moving.push({object:pivot,kind:'hinge',open:o.swing||Math.PI*.42,closed:0});
    }
    function sliding(g,width,height,depth,o) {
      doorway(g,width,height,depth,'sliding');
      var side=.034,inner=width-2*side,panelW=inner/2+.015;
      [-.034,.034].forEach(function(z){box(g,side,.015,z-.006,width-side,.029,z+.006,M.track);});
      for(var n=0;n<2;n++) {
        var sash=new THREE.Group(),left=side+n*(inner-panelW);
        sash.position.set(left,0,n===0?-.028:.028);g.add(sash);
        sash.name=o.id+'-sash-'+n;
        rim(sash,0,.032,panelW,height-.033,0,.038,.032,M.frame,true);
        pane(sash,.033,.066,panelW-.033,height-.067,0,false);
        handle(sash,n===0?panelW-.06:.06,1.02,-.039);
        if(n===0) {sash.userData.motion='slide';moving.push({object:sash,kind:'slide',closed:left,open:side+inner-panelW});}
      }
    }
    function windowUnit(g,width,o,depth) {
      var low=o.sill,high=o.top,fw=.034;
      rim(g,0,low,width,high,0,.07,fw,M.frame,true);
      box(g,-.035,low-.028,-depth/2-.045,width+.035,low,depth/2+.045,M.sill);
      var n=o.panes||Math.max(2,Math.round(width/.75));
      var inner=width-2*fw,each=inner/n;
      for(var k=0;k<n;k++) {
        var x0=fw+k*each+.006,x1=fw+(k+1)*each-.006;
        rim(g,x0,low+fw+.005,x1,high-fw-.005,-.009,.034,.022,M.frame,true);
        pane(g,x0+.023,low+fw+.029,x1-.023,high-fw-.029,-.009,o.frost);
        // End panes are casements; the remaining panes are fixed glazing.
        if(k===0||k===n-1) handle(g,k===0?x1-.041:x0+.041,(low+high)/2,-.05);
      }
      if(o.screenSide) {
        var screenGroup=new THREE.Group();screenGroup.name=o.id+'-screen';screenGroup.userData.kind='screen';
        // A separate inner track avoids z-fighting with glass and window handles.
        var screenZ=o.screenSide*(depth/2+.014);
        screenGroup.position.z=screenZ;g.add(screenGroup);
        rim(screenGroup,.014,low+.014,width-.014,high-.014,0,.018,.018,M.frame,true);
        for(var s=0;s<n;s++) {
          var sx0=fw+s*each+.005,sx1=fw+(s+1)*each-.005;
          var sy0=low+fw+.005,sy1=high-fw-.005;
          rim(screenGroup,sx0,sy0,sx1,sy1,0,.015,.012,M.frame,true);
          var netW=sx1-sx0-.024,netH=sy1-sy0-.024;
          var geometry=new THREE.PlaneGeometry(netW,netH),uv=geometry.attributes.uv;
          // World-scale mesh with mipmaps to soften fine threads at overview zoom.
          for(var q=0;q<uv.count;q++) uv.setXY(q,uv.getX(q)*netW/.006,uv.getY(q)*netH/.006);
          var net=new THREE.Mesh(geometry,M.screen);net.name='screen-mesh';
          net.position.set((sx0+sx1)/2,(sy0+sy1)/2,0);screenGroup.add(net);
          box(screenGroup,sx1-.028,(low+high)/2-.038,-.018,sx1-.013,(low+high)/2+.038,.018,M.hardware);
        }
      }
    }
    walls.forEach(function(w) {
      (w.holes||[]).forEach(function(o) {
        if(!o.window&&!o.door) return;
        var g=new THREE.Group();g.name=o.id||'window';
        g.userData.kind=o.window?'window':'door';g.userData.opening={axis:w.axis,a:o.a,b:o.b,p:w.p,t:w.t,sill:o.sill,top:o.top};
        if(w.axis==='x') g.position.set(o.a,0,w.p+w.t/2);
        else {g.position.set(w.p+w.t/2,0,o.a);g.rotation.y=-Math.PI/2;}
        root.add(g);
        if(o.window) windowUnit(g,o.b-o.a,o,w.t);
        else if(o.door==='sliding') sliding(g,o.b-o.a,o.top,w.t,o);
        else hinged(g,o.b-o.a,o.top,w.t,o);
      });
    });
    function setOpen(open) {
      moving.forEach(function(m) {
        var v=open?m.open:m.closed;
        if(m.kind==='hinge') m.object.rotation.y=v;else m.object.position.x=v;
      });
      root.userData.doorsOpen=open;
    }
    setOpen(true);
    return {root:root,setOpen:setOpen};
  }
  global.JOINERY={build:build};
})(window);
