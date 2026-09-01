import type { ComponentType } from 'react';

import { DesignSystemDiagram } from './DesignSystemDiagram';
import { GpoolDiagram } from './GpoolDiagram';
import { KiniDiagram } from './KiniDiagram';
import { NotificationsDiagram } from './NotificationsDiagram';
import { PlatformOpsDiagram } from './PlatformOpsDiagram';
import { TradingBotDiagram } from './TradingBotDiagram';

/**
 * A diagram per project, keyed by project id.
 *
 * A registry rather than a field on the project, because a diagram is code —
 * putting a component reference in `content/cv.ts` would mean the content
 * module imports the component tree it is supposed to be independent of.
 */
export const PROJECT_DIAGRAMS: Record<string, ComponentType> = {
  gpool: GpoolDiagram,
  'platform-ops': PlatformOpsDiagram,
  'design-system': DesignSystemDiagram,
  'trading-bot': TradingBotDiagram,
  notifications: NotificationsDiagram,
  kini: KiniDiagram,
};
