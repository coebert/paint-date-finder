import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WebGLGuard } from '@/components/field/WebGLGuard';

function Boom(): JSX.Element { throw new Error('Error creating WebGL context'); }

describe('3D street view guard', () => {
  it('shows a fallback instead of rendering 3D when WebGL is unavailable', () => {
    render(<WebGLGuard><p>3d scene</p></WebGLGuard>);
    // jsdom has no WebGL
    expect(screen.queryByText('3d scene')).toBeNull();
    expect(screen.getByText(/3D view isn't available/)).toBeTruthy();
  });
});
export { Boom };
