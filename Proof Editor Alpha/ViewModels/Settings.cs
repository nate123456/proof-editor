using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using System.Windows;
using System.Windows.Media;

namespace Proof_Editor_Alpha
{
    public class Settings
    {
        #region Cell Settings

        public int cellEmptyWidth = 60;
        public bool focusElementUponCreation = true;

        public FontFamily cellFontFamily = new FontFamily("Segoe UI");
        public FontStyle cellFontStyle = FontStyles.Normal;
        public FontWeight cellFontWeight = FontWeights.Normal;
        public FontStretch cellFontStretch = FontStretches.Normal;
        public double cellFontSize = 15;
        public Brush cellBrush = Brushes.Black;

        public FontFamily dischargeFontFamily = new FontFamily("Segoe UI");
        public FontStyle dischargeFontStyle = FontStyles.Normal;
        public FontWeight dischargeFontWeight = FontWeights.Normal;
        public FontStretch dischargeFontStretch = FontStretches.Normal;
        public double dischargeFontSize = 15;
        public Brush dischargeBrush = Brushes.Black;

        public double differenceConstant = 1;

        #endregion

        #region Key Bindings

        #region Tab Control Key Bindings

        #endregion

        #region Proof Key Bindings



        #endregion

        #region Cell Key Bindings

        public Shortcut moveToNewProof = new Shortcut() { key = Key.M, modifiers = ModifierKeys.Control};

        #region Cell Value Text Box Key Bindings

        public Shortcut c_focus_Stroke = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_make_Stroke = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control | ModifierKeys.Shift};

        public Shortcut c_focus_ParentStroke = new Shortcut() { key = Key.Down, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_Make_ParentStroke = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut c_focus_RightCell = new Shortcut() { key = Key.Right, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_Make_RightCell = new Shortcut() { key = Key.Right, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut c_focus_LeftCell = new Shortcut() { key = Key.Left, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_Make_LeftCell = new Shortcut() { key = Key.Left, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut c_focus_Home = new Shortcut() { key = Key.Home, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_Make_Home = new Shortcut() { key = Key.Home, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut c_focus_End = new Shortcut() { key = Key.End, modifiers = ModifierKeys.Control };
        public Shortcut c_focus_Make_End = new Shortcut() { key = Key.End, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut c_remove_Cell = new Shortcut() { key = Key.Delete, modifiers = ModifierKeys.Control };
        public Shortcut c_removeCellStrong = new Shortcut() { key = Key.Delete | Key.Back, modifiers = ModifierKeys.Control | ModifierKeys.Shift };



        #endregion

        #region Stroke Key Bindings

        public Shortcut s_focusFirstChildCell = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control };
        public Shortcut s_makeLastChildCell = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut s_focusCell = new Shortcut() { key = Key.Down, modifiers = ModifierKeys.Control };
        public Shortcut s_focusDischarge = new Shortcut() { key = Key.Right, modifiers = ModifierKeys.Control };
        public Shortcut s_focusEnableDischarge = new Shortcut() { key = Key.Right, modifiers = ModifierKeys.Control | ModifierKeys.Shift };
        public Shortcut s_makeXChildren = new Shortcut() { modifiers = ModifierKeys.Control | ModifierKeys.Shift };
        public Shortcut s_disableStroke = new Shortcut() { key = Key.Delete, modifiers = ModifierKeys.Control };

        #endregion

        #region Discharge Key Bindings

        public Shortcut d_focusStroke = new Shortcut() { key = Key.Left, modifiers = ModifierKeys.Control };

        public Shortcut d_focusLastChild = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control };
        public Shortcut d_makeLastChild = new Shortcut() { key = Key.Up, modifiers = ModifierKeys.Control | ModifierKeys.Shift };

        public Shortcut d_focusCell = new Shortcut() { key = Key.Down, modifiers = ModifierKeys.Control };
        public Shortcut d_disable = new Shortcut() { key = Key.Delete, modifiers = ModifierKeys.Control };

        #endregion

        public List<SpecialCharacter> specialCharacters = new List<SpecialCharacter>();

        #endregion

        #endregion

        public Settings()
        {
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '→', description = "Arrow", escapeSequence = @"\to"});
            specialCharacters.Add(new SpecialCharacter() { charToInsert = 'φ', description = "phi", escapeSequence = @"\varphi" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = 'ψ', description = "psi", escapeSequence = @"\psi" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊥', description = "contradiction", escapeSequence = @"\bots" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⋁', description = "n-ary or" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⋀', description = "n-ary and" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '∨', description = "or", escapeSequence = @"\vee" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '∧', description = "and", escapeSequence = @"\wedge" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '~', description = "tilde", escapeSequence = @"\sim" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '¬', description = "not", escapeSequence = @"\neg" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '↔', description = "double arrow", escapeSequence = @"\leftrightarrow" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '∀', description = "universal", escapeSequence = @"\forall" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '∃', description = "existential", escapeSequence = @"\exists" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊢', description = "proves", escapeSequence = @"\vdash" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊨', description = "entails", escapeSequence = @"\models" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊬', description = "doesn’t prove" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊭', description = "doesn’t entail" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⊩', description = "makes true" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '≠', description = "not equal to", escapeSequence = @"\neq" });
            specialCharacters.Add(new SpecialCharacter() { charToInsert = '⁝', description = "vertical dots", escapeSequence = @"\vdots" });
        }

        public Settings Clone()
        {
            return (Settings)MemberwiseClone();
        }
    }

    public class Shortcut
    {
        public Key key;
        public ModifierKeys modifiers;
        public bool enabled = true;
    }

    public class SpecialCharacter
    {
        public char charToInsert;
        public string description;
        public string escapeSequence = "None";
    }
}
