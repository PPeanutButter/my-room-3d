/* Standalone 3D room model. Plan coordinates are metres: x → right, z → down.
 * Source: 户型图.png. Height and unlabelled wall/opening dimensions are estimates.
 * Existing furnished apartment scripts are deliberately not dependencies.
 */
(function () {
  'use strict';
  var H = 2.70, CX = 4.72, CZ = 4.515;
  var scene, camera, renderer, shell, joinery, fullWalls = true, showLabels = true, doorsOpen = true;
  var labelItems = [], tween = null, frame = 0;
  var canvas = document.getElementById('stage');
  var mobile = function () { return window.innerWidth <= 720; };
  var orbit = { x:0, z:0, y:0.45, theta:-0.32, phi:0.55, span:13.5 };
  var views = {
    all: { x:4.72, z:4.515, y:0.45, theta:-0.32, phi:0.55, span:13.5 },
    top: { x:4.72, z:4.515, y:0, theta:0, phi:0.001, span:11.4 },
    living: { x:3.55, z:4.8, y:0.25, theta:-0.28, phi:0.43, span:8.1 },
    kitchen: { x:7.52, z:1.1, y:0.4, theta:-0.18, phi:0.5, span:5.3 },
    master: { x:6.55, z:5.55, y:0.3, theta:-0.3, phi:0.5, span:6.2 },
    bed2: { x:1.55, z:1.9, y:0.3, theta:-0.15, phi:0.45, span:5.9 },
    bath: { x:7.48, z:2.65, y:0.25, theta:-0.15, phi:0.35, span:5.2 },
    balcony: { x:3.39, z:8.3, y:0.25, theta:-0.25, phi:0.55, span:5.6 }
  };
  // Dimensions explicitly printed on the plan drive the principal axes.
  // The source's area labels and dimension chains are not fully consistent;
  // labels below retain the source areas, rather than claiming surveyed areas.
  var rooms = [
    { name:'客餐厅', area:'22.57', at:[3.9,4.85], poly:[[2.98,.24],[5.96,.24],[5.96,3.56],[5.14,3.56],[5.14,7.45],[1.64,7.45],[1.64,3.68],[2.98,3.68]] },
    { name:'次卧', area:'8.65', at:[1.55,1.95], rect:[.24,.24,2.86,3.56], finish:'wood' },
    { name:'厨房', area:'4.76', at:[7.58,1.03], rect:[6.08,.24,9.2,1.765], tiledWalls:true },
    { name:'卫生间', area:'2.45', at:[6.85,2.72], rect:[6.08,1.885,7.655,3.44], wet:true, finish:'bath', tiledWalls:true },
    { name:'厨房小阳台', area:'2.03', at:[8.55,2.72], rect:[7.895,1.885,9.2,3.44], wet:true, tiledWalls:true },
    { name:'主卧', area:'10.25', at:[6.55,5.6], rect:[5.26,3.68,7.86,7.45], finish:'wood' },
    { name:'阳台', area:'4.27', at:[3.39,8.32], rect:[1.64,7.69,5.14,8.91], wet:true, finish:'balcony' }
  ];
  var outline = [[0,0],[9.44,0],[9.44,3.68],[7.98,3.68],[7.98,7.69],[5.26,7.69],[5.26,9.03],[1.4,9.03],[1.4,3.68],[0,3.68]];
  var mats, boxGeometry = new THREE.BoxGeometry(1,1,1);

  function box(g,x0,y0,z0,x1,y1,z1,mat) {
    if (x1-x0<.001 || y1-y0<.001 || z1-z0<.001) return;
    var m = new THREE.Mesh(boxGeometry,mat);
    m.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
    m.scale.set(x1-x0,y1-y0,z1-z0); m.castShadow=true; m.receiveShadow=true; g.add(m); return m;
  }
  function slab(g, points, y, depth, material) {
    var s = new THREE.Shape();
    points.forEach(function(p,i) { if(i) s.lineTo(p[0],-p[1]); else s.moveTo(p[0],-p[1]); });
    s.closePath();
    var geom = new THREE.ExtrudeGeometry(s,{depth:depth,bevelEnabled:false,curveSegments:1});
    geom.rotateX(-Math.PI/2); geom.translate(0,y-depth,0);
    var mesh = new THREE.Mesh(geom,material); mesh.receiveShadow=true; mesh.castShadow=true; g.add(mesh);
    return mesh;
  }
  function rect(x0,z0,x1,z1) { return [[x0,z0],[x1,z0],[x1,z1],[x0,z1]]; }

  // Openings retain their actual floor/sill heights even when walls are cut down.
  // Wall solids and full-height door/window assemblies share the same openings.
  var walls = [
    { axis:'x', a:0,b:9.44,p:0,t:.24,back:true,holes:[{a:5.05,b:5.93,sill:0,top:2.15,id:'entry-door',door:'entry',hinge:'end',swing:1.35}] },
    // Solid grey areas on the source plan denote non-load-bearing walls, not windows.
    { axis:'z', a:.24,b:3.56,p:0,t:.24 },
    { axis:'z', a:.24,b:3.44,p:9.2,t:.24,back:true },
    { axis:'x', a:.24,b:2.98,p:3.56,t:.12,holes:[{a:.43,b:1.22,sill:.9,top:2.2,window:true,id:'bed2-south-window',screenSide:-1}] },
    { axis:'z', a:.24,b:3.56,p:2.86,t:.12,holes:[{a:2.68,b:3.56,sill:0,top:2.15,id:'bed2-door',door:'wood',hinge:'end',swing:1.3}] },
    { axis:'z', a:.24,b:3.56,p:5.96,t:.12,holes:[{a:.3,b:1.73,sill:0,top:2.25,id:'kitchen-door',door:'sliding'},{a:2.04,b:2.82,sill:0,top:2.1,id:'bath-door',door:'glass',swing:1.25}] },
    { axis:'x', a:6.08,b:9.2,p:1.765,t:.12,holes:[{a:7.92,b:8.73,sill:0,top:2.1}] },
    { axis:'z', a:1.885,b:3.44,p:7.655,t:.24,holes:[{a:2.42,b:3.2,sill:1.05,top:2.15,window:true,id:'bath-window',frost:true}] },
    { axis:'x', a:5.14,b:6.08,p:3.56,t:.12 },
    { axis:'x', a:6.08,b:9.44,p:3.44,t:.24,holes:[{a:8.03,b:9.13,sill:.85,top:2.25,window:true,id:'service-window',screenSide:-1}] },
    { axis:'z', a:3.68,b:7.69,p:1.4,t:.24 },
    { axis:'z', a:3.68,b:7.45,p:5.14,t:.12,holes:[{a:3.68,b:4.57,sill:0,top:2.15,id:'master-door',door:'wood',swing:1.3}] },
    { axis:'z', a:3.68,b:7.69,p:7.86,t:.12,back:true },
    { axis:'x', a:1.64,b:5.14,p:7.45,t:.24,holes:[{a:1.95,b:4.2,sill:0,top:2.3}] },
    { axis:'x', a:5.14,b:7.86,p:7.45,t:.24,holes:[{a:6.55,b:7.51,sill:.85,top:2.25,window:true,id:'master-window',screenSide:-1}] },
    // Balcony finished floor is -0.018 m; sill 0.082 m gives 0.10 m above that floor.
    { axis:'z', a:7.69,b:9.03,p:1.4,t:.24,balcony:true,holes:[{a:7.85,b:8.78,sill:.082,top:2.3,window:true,id:'balcony-west-window',screenSide:-1}] },
    { axis:'z', a:7.69,b:9.03,p:5.14,t:.12,balcony:true,holes:[{a:7.85,b:8.78,sill:.082,top:2.3,window:true,id:'balcony-east-window',screenSide:1}] },
    { axis:'x', a:1.64,b:5.14,p:8.91,t:.12,balcony:true,holes:[{a:1.82,b:4.98,sill:.082,top:2.3,window:true,id:'balcony-south-window',panes:4,screenSide:-1}] }
  ];
  function wallFinish(x,z) {
    var tiled=rooms.some(function(r) {
      if(!r.tiledWalls) return false;
      var a=r.rect;return x>a[0]-.025&&x<a[2]+.025&&z>a[1]-.025&&z<a[3]+.025;
    });
    return tiled?mats.wallTile:mats.wall;
  }
  function wallSolid(g,w,a,b,lo,hi) {
    if(b-a<.001||hi-lo<.001) return;
    var horizontal=w.axis==='x',x0=horizontal?a:w.p,x1=horizontal?b:w.p+w.t;
    var z0=horizontal?w.p:a,z1=horizontal?w.p+w.t:b;
    var xm=(x0+x1)/2,zm=(z0+z1)/2;
    // Box face order: +x, -x, +y, -y, +z, -z. Only room-facing surfaces get tiles.
    var materials=[wallFinish(x1+.01,zm),wallFinish(x0-.01,zm),mats.cut,mats.wall,wallFinish(xm,z1+.01),wallFinish(xm,z0-.01)];
    var geometry=new THREE.BoxGeometry(x1-x0,hi-lo,z1-z0);
    var pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(var i=0;i<pos.count;i++) {
      var x=pos.getX(i)+xm,y=pos.getY(i)+(lo+hi)/2,z=pos.getZ(i)+zm;
      // World-sized UVs avoid stretched grout at doors, windows and wall splits.
      if(Math.abs(normal.getY(i))>.5) uv.setXY(i,x,-z);
      else uv.setXY(i,Math.abs(normal.getX(i))>.5?z:x,y);
    }
    var mesh=new THREE.Mesh(geometry,materials);mesh.position.set(xm,(lo+hi)/2,zm);
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  function wallPiece(g,w,a,b,lo,hi,mat) {
    if(mat===mats.wall) {
      var cuts=[a,b];
      rooms.forEach(function(r) {
        if(!r.tiledWalls) return;
        var indexes=w.axis==='x'?[0,2]:[1,3];
        indexes.forEach(function(i) {var cut=r.rect[i];if(cut>a+.001&&cut<b-.001) cuts.push(cut);});
      });
      cuts.sort(function(p,q){return p-q;});
      for(var i=0;i<cuts.length-1;i++) wallSolid(g,w,cuts[i],cuts[i+1],lo,hi);
      return;
    }
    if (w.axis==='x') return box(g,a,lo,w.p,b,hi,w.p+w.t,mat);
    return box(g,w.p,lo,a,w.p+w.t,hi,b,mat);
  }
  function buildWalls() {
    if(shell) {
      shell.traverse(function(obj){if(obj.geometry&&obj.geometry!==boxGeometry)obj.geometry.dispose();});
      scene.remove(shell);
    }
    shell=new THREE.Group(); shell.name='room-walls'; shell.position.set(-CX,0,-CZ); scene.add(shell);
    walls.forEach(function(w) {
      var h=fullWalls?H:(w.back?H:(w.balcony?.98:1.03));
      if(w.balcony) h=fullWalls?2.4:.98;
      var last=w.a;
      (w.holes||[]).forEach(function(o) {
        wallPiece(shell,w,last,o.a,0,h,mats.wall);
        wallPiece(shell,w,o.a,o.b,0,Math.min(o.sill,h),mats.wall);
        if(h>o.top) wallPiece(shell,w,o.a,o.b,o.top,h,mats.wall);
        last=o.b;
      });
      wallPiece(shell,w,last,w.b,0,h,mats.wall);
      // Thin horizontal cut surface makes the exposed section legible.
      if(h<H && !w.balcony) {
        last=w.a;
        (w.holes||[]).forEach(function(o) {
          wallPiece(shell,w,last,o.a,h,h+.008,mats.cut);
          if(o.sill>=h || o.top<=h) wallPiece(shell,w,o.a,o.b,h,h+.008,mats.cut);
          last=o.b;
        });
        wallPiece(shell,w,last,w.b,h,h+.008,mats.cut);
      }
    });
  }
  function buildModel() {
    mats=Object.assign(FINISHES.create(renderer),{
      base:new THREE.MeshStandardMaterial({color:0x989e96,roughness:1}),
      cut:new THREE.MeshStandardMaterial({color:0xe6e1d7,roughness:1})
    });
    var floors=new THREE.Group(); floors.position.set(-CX,0,-CZ); floors.name='room-floors'; scene.add(floors);
    slab(floors,outline,-.02,.23,[mats.floor,mats.base]);
    rooms.forEach(function(r) {
      var p=r.poly||rect.apply(null,r.rect);
      slab(floors,p,r.wet?-.018:0,.025,mats[r.finish||'floor']);
      var el=document.createElement('div'); el.className='room-label';
      el.innerHTML=r.name+'<small>'+r.area+' m²</small>';
      document.getElementById('labels').appendChild(el);
      labelItems.push({el:el,point:new THREE.Vector3(r.at[0]-CX,.06,r.at[1]-CZ)});
    });
    buildWalls();
    joinery=JOINERY.build(renderer,walls);joinery.root.position.set(-CX,0,-CZ);scene.add(joinery.root);
    var ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xc7c4b9,roughness:1}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-.27; ground.receiveShadow=true; scene.add(ground);
  }
  function lights() {
    scene.add(new THREE.HemisphereLight(0xe5edf5,0xada88e,.65));
    var sun=new THREE.DirectionalLight(0xfff2de,1.65);
    sun.position.set(-3.5,13,7); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:35});
    sun.shadow.normalBias=.025; sun.shadow.bias=-.00015; sun.shadow.radius=4;
    scene.add(sun); scene.add(sun.target);
    var fill=new THREE.DirectionalLight(0xd4e0ef,.35); fill.position.set(6,8,-6); scene.add(fill);
  }
  function projection() {
    var w=innerWidth,h=innerHeight, compact=mobile(), panelHidden=document.getElementById('panel').classList.contains('hidden');
    var left=compact||panelHidden?0:300;
    var top=compact&&!panelHidden?document.getElementById('panel').getBoundingClientRect().height+24:0;
    var usableWidth=Math.max(200,w-left-36), usableHeight=Math.max(180,h-top-85);
    var fit=Math.max(h/usableHeight, h/usableWidth*.94);
    var span=orbit.span*fit;
    camera.left=-span*w/h/2; camera.right=span*w/h/2; camera.top=span/2; camera.bottom=-span/2;
    camera.setViewOffset(w,h,-left/2,-top/2,w,h); camera.updateProjectionMatrix();
  }
  function updateCamera() {
    var r=28, s=Math.sin(orbit.phi);
    camera.position.set(orbit.x+r*s*Math.sin(orbit.theta),orbit.y+r*Math.cos(orbit.phi),orbit.z+r*s*Math.cos(orbit.theta));
    camera.lookAt(orbit.x,orbit.y,orbit.z); projection(); camera.updateMatrixWorld();
  }
  function render() {
    frame=0; updateCamera(); renderer.render(scene,camera);
    labelItems.forEach(function(item) {
      var p=item.point.clone().project(camera);
      var x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
      item.el.style.display=showLabels&&p.z>-1&&p.z<1?'':'none';
      item.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';
    });
  }
  function requestRender() { if(!frame) frame=requestAnimationFrame(render); }
  function selectView(key,animate) {
    var v=views[key]; if(!v) return;
    if(tween) cancelAnimationFrame(tween); tween=null;
    document.querySelectorAll('[data-view]').forEach(function(b) { var on=b.dataset.view===key; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
    var target={x:v.x-CX,z:v.z-CZ,y:v.y,theta:v.theta,phi:v.phi,span:v.span};
    if(!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(orbit,target); requestRender(); return; }
    var start=Object.assign({},orbit), t0=performance.now();
    function step(now) {
      var t=Math.min(1,(now-t0)/650), e=t*t*(3-2*t);
      Object.keys(target).forEach(function(k) { orbit[k]=start[k]+(target[k]-start[k])*e; });
      requestRender(); tween=t<1?requestAnimationFrame(step):null;
    }
    tween=requestAnimationFrame(step);
  }
  function controls() {
    var pointers=new Map(), drag=null, pinch=null;
    function cancelTween() { if(tween) cancelAnimationFrame(tween); tween=null; }
    function pinchState() {
      var a=Array.from(pointers.values());
      return {distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
    }
    function pan(dx,dy) {
      var s=(camera.top-camera.bottom)/innerHeight;
      var right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0), up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
      orbit.x+=(-right.x*dx+up.x*dy)*s; orbit.z+=(-right.z*dx+up.z*dy)*s; orbit.y+=(-right.y*dx+up.y*dy)*s;
    }
    canvas.addEventListener('pointerdown',function(e) {
      cancelTween(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2}; if(pointers.size===2) pinch=pinchState();
    });
    canvas.addEventListener('pointermove',function(e) {
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2) {
        var now=pinchState();
        if(pinch) { orbit.span=THREE.MathUtils.clamp(orbit.span*pinch.distance/Math.max(1,now.distance),2.5,28); pan(now.x-pinch.x,now.y-pinch.y); }
        pinch=now;
      } else if(drag) {
        var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(drag.pan) pan(dx,dy);
        else { orbit.theta-=dx*.006; orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.005,.001,1.35); }
        drag.x=e.clientX; drag.y=e.clientY;
      }
      requestRender();
    });
    function end(e) {
      pointers.delete(e.pointerId); pinch=null;
      var remaining=Array.from(pointers.values())[0]; drag=remaining?{x:remaining.x,y:remaining.y,pan:false}:null;
    }
    canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end); canvas.addEventListener('lostpointercapture',end);
    canvas.addEventListener('contextmenu',function(e) {e.preventDefault();});
    canvas.addEventListener('wheel',function(e) {e.preventDefault();cancelTween();orbit.span=THREE.MathUtils.clamp(orbit.span*Math.exp(e.deltaY*.001),2.5,28);requestRender();},{passive:false});
    document.querySelectorAll('[data-view]').forEach(function(b) {b.addEventListener('click',function(){selectView(b.dataset.view,true);});});
    document.getElementById('walls').addEventListener('click',function(){fullWalls=!fullWalls;this.textContent=fullWalls?'剖面墙高':'完整墙高';this.setAttribute('aria-pressed',String(fullWalls));buildWalls();requestRender();});
    document.getElementById('doors').addEventListener('click',function(){doorsOpen=!doorsOpen;this.textContent=doorsOpen?'关闭房门':'打开房门';this.setAttribute('aria-pressed',String(!doorsOpen));joinery.setOpen(doorsOpen);requestRender();});
    document.getElementById('labelToggle').addEventListener('click',function(){showLabels=!showLabels;this.textContent=showLabels?'隐藏标注':'显示标注';this.setAttribute('aria-pressed',String(!showLabels));requestRender();});
    document.getElementById('toggleInfo').addEventListener('click',function(){var hidden=document.getElementById('panel').classList.toggle('hidden');this.textContent=hidden?'显示信息':'隐藏信息';this.setAttribute('aria-expanded',String(!hidden));requestRender();});
    var dialog=document.getElementById('planDialog');
    document.getElementById('source').addEventListener('click',function(){dialog.showModal();});
    document.getElementById('closePlan').addEventListener('click',function(){dialog.close();});
    dialog.addEventListener('click',function(e){if(e.target===dialog){var b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
    document.getElementById('shot').addEventListener('click',function(){
      render();
      var output=document.createElement('canvas'); output.width=canvas.width; output.height=canvas.height;
      var ctx=output.getContext('2d'); ctx.drawImage(canvas,0,0);
      if(showLabels) {
        var ratio=canvas.width/innerWidth; ctx.scale(ratio,ratio); ctx.textAlign='center';
        labelItems.forEach(function(item) {
          var p=item.point.clone().project(camera); if(p.z<=-1||p.z>=1) return;
          var x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
          ctx.fillStyle='rgba(247,246,240,.85)';ctx.fillRect(x-35,y-18,70,36);
          ctx.fillStyle='#535a4e';ctx.font='12px sans-serif';ctx.fillText(item.el.childNodes[0].textContent,x,y-1);
          ctx.fillStyle='#858a7e';ctx.font='10px sans-serif';ctx.fillText(item.el.querySelector('small').textContent,x,y+12);
        });
      }
      output.toBlob(function(blob){if(!blob)return;var a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='房屋3D_'+Date.now()+'.png';a.click();setTimeout(function(){URL.revokeObjectURL(url);},2000);},'image/png');
    });
    window.addEventListener('resize',function(){renderer.setSize(innerWidth,innerHeight,false);requestRender();});
    window.addEventListener('hashchange',function(){selectView(location.hash.slice(1),true);});
  }
  try {
    renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight,false);
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.background=new THREE.Color(0xdedbd2);
    camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,250);
    buildModel();lights();controls();selectView(views[location.hash.slice(1)]?location.hash.slice(1):'all',false);render();
    var loading=document.getElementById('loading'); loading.style.opacity='0';setTimeout(function(){loading.hidden=true;loading.style.display='none';},320);
  } catch(err) {
    document.getElementById('loading').textContent='三维场景未能启动，请使用支持 WebGL 的现代浏览器打开。';
    console.error(err);
  }
})();
