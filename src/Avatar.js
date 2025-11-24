import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';

function Loader() {
  return <Html center><h3>Loading...</h3></Html>;
}

function Model({ isSpeaking }) {
  const { scene, nodes } = useGLTF('/avatar.glb');
  const group = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // --- 1. HEAD MOVEMENT (Head: head_015) ---
    const head = nodes.head_015;
    if (head) {
      if (isSpeaking) {
        // Bolte waqt gardan hilegi
        head.rotation.x = Math.sin(time * 10) * 0.05; 
        head.rotation.y = Math.sin(time * 2) * 0.1;
      } else {
        // Chup rehne par natural movement
        head.rotation.y = Math.sin(time * 0.5) * 0.05;
        head.rotation.x = 0;
      }
    }

    // --- 2. HAND GESTURES (Arms: upper_armR_017 & upper_armL_016) ---
    // NOTE: Tumhare list ke hisaab se ye exact naam hain
    const rightArm = nodes.upper_armR_017;
    const leftArm = nodes.upper_armL_016;

    if (rightArm && leftArm) {
      if (isSpeaking) {
        // Jab bolega toh haath hilayega (Gestures)
        // Right Arm (Thoda upar aayega aur hilega)
        rightArm.rotation.z = Math.sin(time * 3) * 0.1 + 1.3; // Angle adjust kiya hai (Right side positive hota hai aksar)
        rightArm.rotation.x = Math.sin(time * 3) * 0.1;

        // Left Arm
        leftArm.rotation.z = -Math.sin(time * 3) * 0.1 - 1.3; // Left side negative
        leftArm.rotation.x = Math.sin(time * 3) * 0.1;
      } else {
        // RELAXED POSITION (Jab chup ho)
        // Haath niche side mein (70-80 degrees approx)
        rightArm.rotation.z = 1.4; 
        rightArm.rotation.x = 0;
        
        leftArm.rotation.z = -1.4;
        leftArm.rotation.x = 0;
      }
    }

    // --- 3. BREATHING (Spine: spine_01) ---
    const spine = nodes.spine_01;
    if (spine) {
       spine.position.y = Math.sin(time * 2) * 0.01; // Saans lena
    }
  });
  
  return <primitive 
    ref={group} 
    object={scene} 
    scale={1.1}            
    position={[0, -4.6, 0]} 
  />;
}

export default function Avatar({ isSpeaking }) {
  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: '#dcdde1' }}>
      <Canvas camera={{ position: [0, 0.5, 2.5], fov: 45 }}>
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <spotLight position={[-5, 5, 10]} angle={0.3} />

        <Suspense fallback={<Loader />}>
          <Model isSpeaking={isSpeaking} />
        </Suspense>
        
        <OrbitControls 
            enableZoom={true} 
            target={[0, 9, 0]} 
            minPolarAngle={Math.PI / 3} 
            maxPolarAngle={Math.PI / 2} 
        />
      </Canvas>
    </div>
  );
}