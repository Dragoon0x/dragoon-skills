import React from 'react';

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4 shadow-sm">
      <h2>🚀 {title}</h2>
      <img src="/hero.jpg" />
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <button onClick={() => console.log('clicked')}>Click me</button>
      <div className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 transition-all duration-200 px-4 py-2 mt-4 mb-2 ml-1 mr-1 flex items-center justify-between rounded-md cursor-pointer hover:shadow-md">
        bloated example
      </div>
    </div>
  );
}
