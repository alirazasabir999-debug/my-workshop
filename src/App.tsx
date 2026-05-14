import React, { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import LandingPage from './components/LandingPage';
import MainIDE from './components/MainIDE';

function AppContent() {
  const { currentProject } = useProject();

  if (!currentProject) {
    return <LandingPage />;
  }

  return <MainIDE />;
}

export default function App() {
  return (
    <ProjectProvider>
      <div className="min-h-screen bg-neutral-900 flex justify-center text-white font-sans">
        <div className="w-full min-h-screen max-w-[450px] bg-black border-x border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col">
          <AppContent />
        </div>
      </div>
    </ProjectProvider>
  );
}
