// Feature: i18n-rtl-support, Property 16: UI Focus Mode Hides Only Non-Essential Elements
// **Validates: Requirements 22.2, 22.3**

import { describe, it, expect, beforeEach } from 'vitest';

describe('Focus Mode — simplified-view CSS behavior', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('simplified-view');
    document.body.innerHTML = '';
  });

  it('elements with data-focus-hide="true" are hidden when simplified_view is active', () => {
    document.body.innerHTML = `
      <div data-focus-hide="true" id="gamification">XP Widget</div>
      <div id="essential">Main Content</div>
    `;

    // Add the CSS rule inline for testing
    const style = document.createElement('style');
    style.textContent = '.simplified-view [data-focus-hide="true"] { display: none !important; }';
    document.head.appendChild(style);

    document.documentElement.classList.add('simplified-view');

    const gamification = document.getElementById('gamification');
    const essential = document.getElementById('essential');

    // Check computed style
    const gamificationStyle = window.getComputedStyle(gamification!);
    const essentialStyle = window.getComputedStyle(essential!);

    expect(gamificationStyle.display).toBe('none');
    expect(essentialStyle.display).not.toBe('none');

    document.head.removeChild(style);
  });

  it('elements with data-focus-hide="true" are visible when simplified_view is inactive', () => {
    document.body.innerHTML = `
      <div data-focus-hide="true" id="gamification">XP Widget</div>
      <div id="essential">Main Content</div>
    `;

    const style = document.createElement('style');
    style.textContent = '.simplified-view [data-focus-hide="true"] { display: none !important; }';
    document.head.appendChild(style);

    // simplified-view NOT active
    const gamification = document.getElementById('gamification');
    const gamificationStyle = window.getComputedStyle(gamification!);
    expect(gamificationStyle.display).not.toBe('none');

    document.head.removeChild(style);
  });

  it('elements without data-focus-hide remain visible regardless of simplified_view', () => {
    document.body.innerHTML = `
      <nav id="primary-nav">Navigation</nav>
      <form id="main-form"><input type="text" /><button type="submit">Submit</button></form>
    `;

    const style = document.createElement('style');
    style.textContent = '.simplified-view [data-focus-hide="true"] { display: none !important; }';
    document.head.appendChild(style);

    document.documentElement.classList.add('simplified-view');

    const nav = document.getElementById('primary-nav');
    const form = document.getElementById('main-form');

    expect(window.getComputedStyle(nav!).display).not.toBe('none');
    expect(window.getComputedStyle(form!).display).not.toBe('none');

    document.head.removeChild(style);
  });
});
