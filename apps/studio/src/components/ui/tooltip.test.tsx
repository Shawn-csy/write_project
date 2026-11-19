import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

describe('Tooltip', () => {
    it('should render the trigger', () => {
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button>Hover me</button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Tooltip text</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByText('Hover me')).toBeInTheDocument();
    });
});
