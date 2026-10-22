import './STORY_START.js';
import './STORY_CONTRYSAFE.js';
import './STORY_NEWTHEC.js';
import './STORY_PEOPLE.js';
import './STORY_CLEANPOWER.js';
import './STORY_ENVIRON.js';
import './STORY_RADIATION.js';
import './STORY_END.js';
import { storySummary } from '../../catalog.js';

// Never derive chapter order from the timing of individual module evaluation.
window.NEG.story.order = storySummary.order.slice();
