import { StreamLanguage } from "@codemirror/language";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const fountainParser = {
  token: function (stream, state) {
    // 1. Scene Headers
    // Force uppercase check for standard scene headers
    // Regex: ^(INT|EXT|EST|INT\./EXT|INT/EXT|I/E)\.?
    if (stream.match(/^((?:INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)[\.\s])|^(\.[^\.]+)/i, false)) {
      if (stream.match(/^((?:INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)[\.\s].*)|(\.[^\.]+.*)/i)) {
         return "scene-header";
      }
    }

    // 2. Transitions (Uppercased, ends with TO:)
    // Must be preceded by empty line (handled by state usually, but simplified here)
    if (stream.match(/^[A-Z\s]+TO:$/, true)) {
      return "transition";
    }
    // Force > Center text (Transitions)
    if (stream.match(/^>.*$/, true)) {
        return "transition";
    }

    // 3. Sections & Synopses
    if (stream.match(/^#.*/)) return "section";
    if (stream.match(/^=.*/)) return "synopsis";

    // 4. Notes and Boneyard
    if (stream.match(/^\[\[/)) {
        while (stream.next() != null && !stream.match(']]', false)) {}
        stream.match(']]');
        return "note"; 
    }
    
    // 5. Page Breaks
    if (stream.match(/^={3,}/)) return "page-break";

    // 6. Character
    // Pure uppercase line, not a scene header, usually followed by dialogue.
    // Simplifying: If whole line is uppercase and not empty
    if (stream.match(/^[A-Z][A-Z0-9\s\.\(\)\-\']*$/, false)) {
        // Look ahead? Stream parser doesn't do lookahead across lines easily.
        // We assume uppercase line is Character for now (unless it's a Transition handled above).
        stream.skipToEnd();
        return "character";
    }

    // 7. Parenthetical
    if (stream.match(/^\s*\(.*\)\s*$/)) {
      return "paren";
    }

    // Default: Dialogue or Action?
    // In Fountain, Action is default. Dialogue follows Character.
    // Tracking this requires state.
    
    // Simple fallback: If previous line was Character or Paren, this is Dialogue.
    // State management is needed.
    stream.next();
    return null;
  },
  
  startState: function() {
    return {
      lastToken: null, // 'character', 'dialogue', 'sceneline', 'empty'
      inDialogue: false
    };
  },
  
  copyState: function(state) {
    return { ...state };
  },

  blankLine: function(state) {
    state.lastToken = 'empty';
    state.inDialogue = false;
  }
};

// Improved Tokenizer with State
const fountainParserWithState = {
  token: function (stream, state) {
    if (stream.sol()) {
      // Logic that runs at start of line
      // Check for Scene Header
      if (stream.match(/^((?:INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)[\.\s])|^(\.[^\.]+)/i)) {
        state.lastToken = 'scene-header';
        stream.skipToEnd();
        return "heading scene-header"; // Using standard tag mapping often helps
      }
      
      // Check for Transition
      if (stream.match(/^[A-Z\s]+TO:$/) || stream.match(/^>.*$/)) {
         state.lastToken = 'transition';
         // stream.skipToEnd(); // match consumes it
         return "keyword transition";
      }
      
      // Section
      if (stream.match(/^#+/)) {
          stream.skipToEnd();
          return "meta section";
      }

       // Synopsis
      if (stream.match(/^=/)) {
          stream.skipToEnd();
          return "meta synopsis";
      }
    }

    // Character
    // Must be uppercase, not a scene header (checked above).
    // And ideally preceded by empty line, but standard parser is lenient.
    // We strictly check for "All Caps"
     if (stream.sol() && stream.match(/^[A-Z][A-Z0-9\s\.\(\)\-\']*$/)) {
        state.lastToken = 'character';
        state.inDialogue = true;
        return "variableName character";
     }

     // Parenthetical
     if (stream.match(/^\s*\(.*\)\s*$/)) {
         // Should be inside dialogue
         if (state.inDialogue) {
             state.lastToken = 'paren';
             return "comment paren";
         }
     }

     // Dialogue (fallback if inDialogue)
     // If we are in dialogue, and line is not empty (blankLine handles empty), it is dialogue?
     // Actually stream.next() consumes chars. 
     // If we matched nothing specific above:
     
     if (state.inDialogue) {
          stream.skipToEnd();
          state.lastToken = 'dialogue';
          return "string dialogue"; // utilizing string color for dialogue
     }

     // Action (Default)
     stream.skipToEnd();
     state.lastToken = 'action';
     return "content action";
  },

  startState: () => ({ lastToken: null, inDialogue: false }),
  blankLine: (state) => {
    state.lastToken = 'empty';
    state.inDialogue = false;
  }
};

export const fountainLanguage = StreamLanguage.define(fountainParserWithState);

// Define a HighlightStyle to map our custom tags to colors if needed, 
// OR we can rely on standard tags. 
// "heading" -> purple/blue
// "variableName" -> yellow/orange (Character)
// "string" -> green (Dialogue)
// "comment" -> gray (Paren)
// "content" -> default text (Action)

// We can create a custom theme later to map these specific class names if we want specific screenplay colors.
