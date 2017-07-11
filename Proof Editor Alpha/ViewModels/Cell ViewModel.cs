using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;

namespace Proof_Editor_Alpha
{
    public class CellViewModel : INotifyPropertyChanged
    {
        /// <summary>
        /// the model object that this VM represents
        /// </summary>
        public CellModel cell = new CellModel();

        /// <summary>
        /// The settings profile that this VM uses
        /// </summary>
        public Settings settings = new Settings();

        /// <summary>
        /// whether or not the cell is visible, as calculated by the method that determines if the cell is within the user's view.
        /// can also be manually changed to hide or show the cell
        /// </summary>
        private bool _isVisible = true;
        public bool isVisible
        {
            get
            {
                return _isVisible;
            }
            set
            {
                if (value != _isVisible)
                {
                    _isVisible = value;
                    if (isVisible) { CalculatePositionInProof("isVisible (must be true)"); }
                    OnPropertyChanged("isVisible");
                }
            }
        }

        #region Settings Bindings

        public FontFamily cellFontFamily
        {
            get
            {
                return settings.cellFontFamily;
            }
            set
            {
                if(value != settings.cellFontFamily)
                {
                    settings.cellFontFamily = value;
                    OnPropertyChanged("cellFontFamily");
                }
            }
        }

        public FontStyle cellFontStyle
        {
            get
            {
                return settings.cellFontStyle;
            }
            set
            {
                if (value != settings.cellFontStyle)
                {
                    settings.cellFontStyle = value;
                    OnPropertyChanged("cellFontStyle");
                }
            }
        }

        public FontWeight cellFontWeight
        {
            get
            {
                return settings.cellFontWeight;
            }
            set
            {
                if (value != settings.cellFontWeight)
                {
                    settings.cellFontWeight = value;
                    OnPropertyChanged("cellFontWeight");
                }
            }
        }

        public FontStretch cellFontStretch
        {
            get
            {
                return settings.cellFontStretch;
            }
            set
            {
                if (value != settings.cellFontStretch)
                {
                    settings.cellFontStretch = value;
                    OnPropertyChanged("cellFontStretch");
                }
            }
        }

        public double cellFontSize
        {
            get
            {
                return settings.cellFontSize;
            }
            set
            {
                if (value != settings.cellFontSize)
                {
                    settings.cellFontSize = value;
                    OnPropertyChanged("cellFontSize");
                }
            }
        }

        public Brush cellBrush
        {
            get
            {
                return settings.cellBrush;
            }
            set
            {
                if (value != settings.cellBrush)
                {
                    settings.cellBrush = value;
                    OnPropertyChanged("cellBrush");
                }
            }
        }

        public FontFamily dischargeFontFamily
        {
            get
            {
                return settings.dischargeFontFamily;
            }
            set
            {
                if (value != settings.dischargeFontFamily)
                {
                    settings.dischargeFontFamily = value;
                    OnPropertyChanged("dischargeFontFamily");
                }
            }
        }

        public FontStyle dischargeFontStyle
        {
            get
            {
                return settings.dischargeFontStyle;
            }
            set
            {
                if (value != settings.dischargeFontStyle)
                {
                    settings.dischargeFontStyle = value;
                    OnPropertyChanged("dischargeFontStyle");
                }
            }
        }

        public FontWeight dischargeFontWeight
        {
            get
            {
                return settings.dischargeFontWeight;
            }
            set
            {
                if (value != settings.dischargeFontWeight)
                {
                    settings.dischargeFontWeight = value;
                    OnPropertyChanged("dischargeFontWeight");
                }
            }
        }

        public FontStretch dischargeFontStretch
        {
            get
            {
                return settings.dischargeFontStretch;
            }
            set
            {
                if (value != settings.dischargeFontStretch)
                {
                    settings.dischargeFontStretch = value;
                    OnPropertyChanged("dischargeFontStretch");
                }
            }
        }

        public double dischargeFontSize
        {
            get
            {
                return settings.dischargeFontSize;
            }
            set
            {
                if (value != settings.dischargeFontSize)
                {
                    settings.dischargeFontSize = value;
                    OnPropertyChanged("dischargeFontSize");
                }
            }
        }

        public Brush dischargeBrush
        {
            get
            {
                return settings.dischargeBrush;
            }
            set
            {
                if (value != settings.dischargeBrush)
                {
                    settings.dischargeBrush = value;
                    OnPropertyChanged("dischargeBrush");
                }
            }
        }

        #region Cell Key Bindings

        public Key moveToNewProofKeys
        {
            get { return settings.moveToNewProof.key; }
            set
            {
                if (value != settings.moveToNewProof.key)
                {
                    settings.moveToNewProof.key = value;
                    OnPropertyChanged("moveToNewProofKeys");
                }
            }
        }
        public ModifierKeys moveToNewProofModifiers
        {
            get { return settings.moveToNewProof.modifiers; }
            set
            {
                if (value != settings.moveToNewProof.modifiers)
                {
                    settings.moveToNewProof.modifiers = value;
                    OnPropertyChanged("moveToNewProofModifiers");
                }
            }
        }

        #region Cell Value Text Box Key Bindings

        public Key c_focus_StrokeKeys
        {
            get { return settings.c_focus_Stroke.key; }
            set
            {
                if (value != settings.c_focus_Stroke.key)
                {
                    settings.c_focus_Stroke.key = value;
                    OnPropertyChanged("c_focus_StrokeKeys");
                }
            }
        }
        public ModifierKeys c_focus_StrokeModifiers
        {
            get { return settings.c_focus_Stroke.modifiers; }
            set
            {
                if (value != settings.c_focus_Stroke.modifiers)
                {
                    settings.c_focus_Stroke.modifiers = value;
                    OnPropertyChanged("c_focus_StrokeModifiers");
                }
            }
        }

        public Key c_focus_make_StrokeKeys
        {
            get { return settings.c_focus_make_Stroke.key; }
            set
            {
                if (value != settings.c_focus_make_Stroke.key)
                {
                    settings.c_focus_make_Stroke.key = value;
                    OnPropertyChanged("c_focus_make_StrokeKeys");
                }
            }
        }
        public ModifierKeys c_focus_make_StrokeModifiers
        {
            get { return settings.c_focus_make_Stroke.modifiers; }
            set
            {
                if (value != settings.c_focus_make_Stroke.modifiers)
                {
                    settings.c_focus_make_Stroke.modifiers = value;
                    OnPropertyChanged("c_focus_make_StrokeModifiers");
                }
            }
        }

        public Key c_focus_ParentStrokeKeys
        {
            get { return settings.c_focus_ParentStroke.key; }
            set
            {
                if (value != settings.c_focus_ParentStroke.key)
                {
                    settings.c_focus_ParentStroke.key = value;
                    OnPropertyChanged("c_focus_ParentStrokeKeys");
                }
            }
        }
        public ModifierKeys c_focus_ParentStrokeModifiers
        {
            get { return settings.c_focus_ParentStroke.modifiers; }
            set
            {
                if (value != settings.c_focus_ParentStroke.modifiers)
                {
                    settings.c_focus_ParentStroke.modifiers = value;
                    OnPropertyChanged("c_focus_ParentStrokeModifiers");
                }
            }
        }

        public Key c_focus_Make_ParentStrokeKeys
        {
            get { return settings.c_focus_ParentStroke.key; }
            set
            {
                if (value != settings.c_focus_ParentStroke.key)
                {
                    settings.c_focus_ParentStroke.key = value;
                    OnPropertyChanged("c_focus_Make_ParentStrokeKeys");
                }
            }
        }
        public ModifierKeys c_focus_Make_ParentStrokeModifiers
        {
            get { return settings.c_focus_Make_ParentStroke.modifiers; }
            set
            {
                if (value != settings.c_focus_Make_ParentStroke.modifiers)
                {
                    settings.c_focus_Make_ParentStroke.modifiers = value;
                    OnPropertyChanged("c_focus_Make_ParentStrokeModifiers");
                }
            }
        }

        public Key c_focus_RightCellKeys
        {
            get { return settings.c_focus_RightCell.key; }
            set
            {
                if (value != settings.c_focus_RightCell.key)
                {
                    settings.c_focus_RightCell.key = value;
                    OnPropertyChanged("c_focus_RightCellKeys");
                }
            }
        }
        public ModifierKeys c_focus_RightCellModifiers
        {
            get { return settings.c_focus_RightCell.modifiers; }
            set
            {
                if (value != settings.c_focus_RightCell.modifiers)
                {
                    settings.c_focus_RightCell.modifiers = value;
                    OnPropertyChanged("c_focus_RightCellModifiers");
                }
            }
        }

        public Key c_focus_Make_RightCellKeys
        {
            get { return settings.c_focus_Make_RightCell.key; }
            set
            {
                if (value != settings.c_focus_Make_RightCell.key)
                {
                    settings.c_focus_Make_RightCell.key = value;
                    OnPropertyChanged("c_focus_Make_RightCellKeys");
                }
            }
        }
        public ModifierKeys c_focus_Make_RightCellModifiers
        {
            get { return settings.c_focus_Make_RightCell.modifiers; }
            set
            {
                if (value != settings.c_focus_Make_RightCell.modifiers)
                {
                    settings.c_focus_Make_RightCell.modifiers = value;
                    OnPropertyChanged("c_focus_Make_RightCellModifiers");
                }
            }
        }

        public Key c_focus_LeftCellKeys
        {
            get { return settings.c_focus_LeftCell.key; }
            set
            {
                if (value != settings.c_focus_LeftCell.key)
                {
                    settings.c_focus_LeftCell.key = value;
                    OnPropertyChanged("c_focus_LeftCellKeys");
                }
            }
        }
        public ModifierKeys c_focus_LeftCellModifiers
        {
            get { return settings.c_focus_LeftCell.modifiers; }
            set
            {
                if (value != settings.c_focus_LeftCell.modifiers)
                {
                    settings.c_focus_LeftCell.modifiers = value;
                    OnPropertyChanged("c_focus_LeftCellModifiers");
                }
            }
        }

        public Key c_focus_Make_LeftCellKeys
        {
            get { return settings.c_focus_Make_LeftCell.key; }
            set
            {
                if (value != settings.c_focus_Make_LeftCell.key)
                {
                    settings.c_focus_Make_LeftCell.key = value;
                    OnPropertyChanged("c_focus_Make_LeftCellKeys");
                }
            }
        }
        public ModifierKeys c_focus_Make_LeftCellModifiers
        {
            get { return settings.c_focus_Make_LeftCell.modifiers; }
            set
            {
                if (value != settings.c_focus_Make_LeftCell.modifiers)
                {
                    settings.c_focus_Make_LeftCell.modifiers = value;
                    OnPropertyChanged("c_focus_Make_LeftCellModifiers");
                }
            }
        }

        public Key c_focus_HomeKeys
        {
            get { return settings.c_focus_Home.key; }
            set
            {
                if (value != settings.c_focus_Home.key)
                {
                    settings.c_focus_Home.key = value;
                    OnPropertyChanged("c_focus_HomeKeys");
                }
            }
        }
        public ModifierKeys c_focus_HomeModifiers
        {
            get { return settings.c_focus_Home.modifiers; }
            set
            {
                if (value != settings.c_focus_Home.modifiers)
                {
                    settings.c_focus_Home.modifiers = value;
                    OnPropertyChanged("c_focus_HomeModifiers");
                }
            }
        }

        public Key c_focus_Make_HomeKeys
        {
            get { return settings.c_focus_Make_Home.key; }
            set
            {
                if (value != settings.c_focus_Make_Home.key)
                {
                    settings.c_focus_Make_Home.key = value;
                    OnPropertyChanged("c_focus_Make_HomeKeys");
                }
            }
        }
        public ModifierKeys c_focus_Make_HomeModifiers
        {
            get { return settings.c_focus_Make_Home.modifiers; }
            set
            {
                if (value != settings.c_focus_Make_Home.modifiers)
                {
                    settings.c_focus_Make_Home.modifiers = value;
                    OnPropertyChanged("c_focus_Make_HomeModifiers");
                }
            }
        }

        public Key c_focus_EndKeys
        {
            get { return settings.c_focus_End.key; }
            set
            {
                if (value != settings.c_focus_End.key)
                {
                    settings.c_focus_End.key = value;
                    OnPropertyChanged("c_focus_EndKeys");
                }
            }
        }
        public ModifierKeys c_focus_EndModifiers
        {
            get { return settings.c_focus_End.modifiers; }
            set
            {
                if (value != settings.c_focus_End.modifiers)
                {
                    settings.c_focus_End.modifiers = value;
                    OnPropertyChanged("c_focus_EndModifiers");
                }
            }
        }

        public Key c_focus_Make_EndKeys
        {
            get { return settings.c_focus_Make_End.key; }
            set
            {
                if (value != settings.c_focus_Make_End.key)
                {
                    settings.c_focus_Make_End.key = value;
                    OnPropertyChanged("c_focus_Make_EndKeys");
                }
            }
        }
        public ModifierKeys c_focus_Make_EndModifiers
        {
            get { return settings.c_focus_Make_End.modifiers; }
            set
            {
                if (value != settings.c_focus_Make_End.modifiers)
                {
                    settings.c_focus_Make_End.modifiers = value;
                    OnPropertyChanged("c_focus_Make_EndModifiers");
                }
            }
        }

        public Key c_remove_CellKeys
        {
            get { return settings.c_remove_Cell.key; }
            set
            {
                if (value != settings.c_remove_Cell.key)
                {
                    settings.c_remove_Cell.key = value;
                    OnPropertyChanged("c_remove_CellKeys");
                }
            }
        }
        public ModifierKeys c_remove_CellModifiers
        {
            get { return settings.c_remove_Cell.modifiers; }
            set
            {
                if (value != settings.c_remove_Cell.modifiers)
                {
                    settings.c_remove_Cell.modifiers = value;
                    OnPropertyChanged("c_remove_CellModifiers");
                }
            }
        }

        public Key c_removeCellStrongKeys
        {
            get { return settings.c_removeCellStrong.key; }
            set
            {
                if (value != settings.c_removeCellStrong.key)
                {
                    settings.c_removeCellStrong.key = value;
                    OnPropertyChanged("c_removeCellStrongKeys");
                }
            }
        }
        public ModifierKeys c_removeCellStrongModifiers
        {
            get { return settings.c_removeCellStrong.modifiers; }
            set
            {
                if (value != settings.c_removeCellStrong.modifiers)
                {
                    settings.c_removeCellStrong.modifiers = value;
                    OnPropertyChanged("c_removeCellStrongModifiers");
                }
            }
        }


        #endregion

        #region Stroke Key Bindings

        public Key s_focusFirstChildCellKeys
        {
            get { return settings.s_focusFirstChildCell.key; }
            set
            {
                if (value != settings.s_focusFirstChildCell.key)
                {
                    settings.s_focusFirstChildCell.key = value;
                    OnPropertyChanged("s_focusFirstChildCellKeys");
                }
            }
        }
        public ModifierKeys s_focusFirstChildCellModifiers
        {
            get { return settings.s_focusFirstChildCell.modifiers; }
            set
            {
                if (value != settings.s_focusFirstChildCell.modifiers)
                {
                    settings.s_focusFirstChildCell.modifiers = value;
                    OnPropertyChanged("s_focusFirstChildCellModifiers");
                }
            }
        }

        public Key s_makeLastChildCellKeys
        {
            get { return settings.s_makeLastChildCell.key; }
            set
            {
                if (value != settings.s_makeLastChildCell.key)
                {
                    settings.s_makeLastChildCell.key = value;
                    OnPropertyChanged("s_makeLastChildCellKeys");
                }
            }
        }
        public ModifierKeys s_makeLastChildCellModifiers
        {
            get { return settings.s_makeLastChildCell.modifiers; }
            set
            {
                if (value != settings.s_makeLastChildCell.modifiers)
                {
                    settings.s_makeLastChildCell.modifiers = value;
                    OnPropertyChanged("s_makeLastChildCellModifiers");
                }
            }
        }

        public Key s_focusCellKeys
        {
            get { return settings.s_focusCell.key; }
            set
            {
                if (value != settings.s_focusCell.key)
                {
                    settings.s_focusCell.key = value;
                    OnPropertyChanged("s_focusCellKeys");
                }
            }
        }
        public ModifierKeys s_focusCellModifiers
        {
            get { return settings.s_focusCell.modifiers; }
            set
            {
                if (value != settings.s_focusCell.modifiers)
                {
                    settings.s_focusCell.modifiers = value;
                    OnPropertyChanged("s_focusCellModifiers");
                }
            }
        }

        public Key s_focusDischargeKeys
        {
            get { return settings.s_focusDischarge.key; }
            set
            {
                if (value != settings.s_focusDischarge.key)
                {
                    settings.s_focusDischarge.key = value;
                    OnPropertyChanged("s_focusDischargeKeys");
                }
            }
        }
        public ModifierKeys s_focusDischargeModifiers
        {
            get { return settings.s_focusDischarge.modifiers; }
            set
            {
                if (value != settings.s_focusDischarge.modifiers)
                {
                    settings.s_focusDischarge.modifiers = value;
                    OnPropertyChanged("s_focusDischargeModifiers");
                }
            }
        }

        public Key s_focusEnableDischargeKeys
        {
            get { return settings.s_focusEnableDischarge.key; }
            set
            {
                if (value != settings.s_focusEnableDischarge.key)
                {
                    settings.s_focusEnableDischarge.key = value;
                    OnPropertyChanged("s_focusEnableDischargeKeys");
                }
            }
        }
        public ModifierKeys s_focusEnableDischargeModifiers
        {
            get { return settings.s_focusEnableDischarge.modifiers; }
            set
            {
                if (value != settings.s_focusEnableDischarge.modifiers)
                {
                    settings.s_focusEnableDischarge.modifiers = value;
                    OnPropertyChanged("s_focusEnableDischargeModifiers");
                }
            }
        }

        public ModifierKeys s_makeXChildrenModifiers
        {
            get { return settings.s_makeXChildren.modifiers; }
            set
            {
                if (value != settings.s_makeXChildren.modifiers)
                {
                    settings.s_makeXChildren.modifiers = value;
                    OnPropertyChanged("s_makeXChildrenModifiers");
                }
            }
        }

        public Key s_disableStrokeKeys
        {
            get { return settings.s_disableStroke.key; }
            set
            {
                if (value != settings.s_disableStroke.key)
                {
                    settings.s_disableStroke.key = value;
                    OnPropertyChanged("s_disableStrokeKeys");
                }
            }
        }
        public ModifierKeys s_disableStrokeModifiers
        {
            get { return settings.s_disableStroke.modifiers; }
            set
            {
                if (value != settings.s_disableStroke.modifiers)
                {
                    settings.s_disableStroke.modifiers = value;
                    OnPropertyChanged("s_disableStrokeModifiers");
                }
            }
        }

        #endregion

        #region Discharge Key Bindings

        public Key d_focusStrokeKeys
        {
            get { return settings.d_focusStroke.key; }
            set
            {
                if (value != settings.d_focusStroke.key)
                {
                    settings.d_focusStroke.key = value;
                    OnPropertyChanged("d_focusStrokeKeys");
                }
            }
        }
        public ModifierKeys d_focusStrokeModifiers
        {
            get { return settings.d_focusStroke.modifiers; }
            set
            {
                if (value != settings.d_focusStroke.modifiers)
                {
                    settings.d_focusStroke.modifiers = value;
                    OnPropertyChanged("d_focusStrokeModifiers");
                }
            }
        }

        public Key d_focusLastChildKeys
        {
            get { return settings.d_focusLastChild.key; }
            set
            {
                if (value != settings.d_focusLastChild.key)
                {
                    settings.d_focusLastChild.key = value;
                    OnPropertyChanged("d_focusLastChildKeys");
                }
            }
        }
        public ModifierKeys d_focusLastChildModifiers
        {
            get { return settings.d_focusLastChild.modifiers; }
            set
            {
                if (value != settings.d_focusLastChild.modifiers)
                {
                    settings.d_focusLastChild.modifiers = value;
                    OnPropertyChanged("d_focusLastChildModifiers");
                }
            }
        }

        public Key d_makeLastChildKeys
        {
            get { return settings.d_makeLastChild.key; }
            set
            {
                if (value != settings.d_makeLastChild.key)
                {
                    settings.d_makeLastChild.key = value;
                    OnPropertyChanged("d_makeLastChildKeys");
                }
            }
        }
        public ModifierKeys d_makeLastChildModifiers
        {
            get { return settings.d_makeLastChild.modifiers; }
            set
            {
                if (value != settings.d_makeLastChild.modifiers)
                {
                    settings.d_makeLastChild.modifiers = value;
                    OnPropertyChanged("d_makeLastChildModifiers");
                }
            }
        }

        public Key d_focusCellKeys
        {
            get { return settings.d_focusCell.key; }
            set
            {
                if (value != settings.d_focusCell.key)
                {
                    settings.d_focusCell.key = value;
                    OnPropertyChanged("d_focusCellKeys");
                }
            }
        }
        public ModifierKeys d_focusCellModifiers
        {
            get { return settings.d_focusCell.modifiers; }
            set
            {
                if (value != settings.d_focusCell.modifiers)
                {
                    settings.d_focusCell.modifiers = value;
                    OnPropertyChanged("d_focusCellModifiers");
                }
            }
        }

        public Key d_disableKeys
        {
            get { return settings.d_disable.key; }
            set
            {
                if (value != settings.d_disable.key)
                {
                    settings.d_disable.key = value;
                    OnPropertyChanged("d_disableKeys");
                }
            }
        }
        public ModifierKeys d_disableModifiers
        {
            get { return settings.d_disable.modifiers; }
            set
            {
                if (value != settings.d_disable.modifiers)
                {
                    settings.d_disable.modifiers = value;
                    OnPropertyChanged("d_disableModifiers");
                }
            }
        }

        #endregion

        #endregion

        #endregion

        #region ViewBound/General Properties
        

        /// <summary>
        /// Represents the value of the cell. Updates the CellModel directly when a new value is received. 
        /// Binding: the view's textbox is bound to this property using two-way binding. 
        /// Also, if the cell value is empty, it sets the emptyCellWidth to 50, otherwise it sets it to auto. 
        /// </summary>
        public string cellValue
        {
            get
            {
                textWidth = Math.Max(MeasureString(cell.cellValue).Width + 6, settings.cellEmptyWidth);
                return cell.cellValue;
            }
            set
            {
                if (cell.cellValue != value)
                {
                    cell.cellValue = value;
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        SpecialCharCheck();
                        textWidth = Math.Max(MeasureString(value).Width + 6, settings.cellEmptyWidth);
                        OnPropertyChanged("cellValue");
                        OnPropertyChanged("children");
                        //to alert the view to check to see if it needs to set its cell width to the empty cell width or not
                        OnPropertyChanged("cellEmptyWidth");
                        CalculateBoxHeight("cellValue");
                    }, null);

                    //SpecialCharCheck();
                    //textWidth = Math.Max(MeasureString(value).Width + 6, settings.cellEmptyWidth);
                    //OnPropertyChanged("cellValue");
                    //OnPropertyChanged("children");
                    ////to alert the view to check to see if it needs to set its cell width to the empty cell width or not
                    //OnPropertyChanged("cellEmptyWidth");
                    //CalculateBoxHeight("cellValue");
                }
            }
        }

        /// <summary>
        /// Represents the value of the discharge. Updates the CellModel directly when a new value is received. 
        /// Binding: the view's discharge textbox is bound to this property using two-way binding. 
        /// </summary>
        public string dischargeValue
        {
            get { return cell.dischargeValue; }
            set
            {
                if (cell.dischargeValue != value)
                {
                    cell.dischargeValue = value;
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        OnPropertyChanged("dischargeValue");
                        OnPropertyChanged("children");
                    }, null);
                    //OnPropertyChanged("dischargeValue");
                    //OnPropertyChanged("children");
                }
            }
        }

        /// <summary>
        /// Represents the visibility of the stroke in the view. Updates the CellModel directly when a new value is received. 
        /// Note that the set is only used for when the user wants the stroke to be displayed in a situation where it does not have to be displayed.
        /// Binding: the view's stroke object is bound via one-way binding; the view object only gets the value.
        /// </summary>
        public bool strokeIsVisible
        {
            get
            {
                if (dischargeIsVisible) { return true; }
                if (children.Count > 0) { return true; }
                return cell.strokeIsVisible;
            }
            set
            {
                if (cell.strokeIsVisible != value)
                {
                    cell.strokeIsVisible = value;
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        OnPropertyChanged("strokeIsVisible");
                        OnPropertyChanged("children");
                    }, null);
                    //OnPropertyChanged("strokeIsVisible");
                    //OnPropertyChanged("children");
                }
            }
        }

        /// <summary>
        /// A setting that will be abstracted later to a window setting. Represents the width that the cell textbox takes up
        /// when there's no text inside of it.
        /// the cell value property updates this value based on the cell value: if text, then auto size, otherwise set to 50
        /// Binding: One-Way binding; the view object only gets the value. 
        /// </summary>
        public double cellEmptyWidth
        {
            get
            {
                if (cellValue == "") { return settings.cellEmptyWidth; }
                else { return double.NaN; }
            }
        }

        private bool _cellIsFocused = false;
        /// <summary>
        /// represents the focused state of the cell text box.
        /// Bindings: isFocused property updates this value. 
        /// </summary>
        public bool cellIsFocused
        {
            get { return _cellIsFocused; }
            set
            {
                if (value != _cellIsFocused)
                {
                    _cellIsFocused = value;
                    OnPropertyChanged("cellIsFocused");
                }
            }
        }

        private bool _strokeIsFocused = false;
        /// <summary>
        /// represents the focused state of the stroke.
        /// Bindings: isFocused property updates this value. 
        /// </summary>
        public bool strokeIsFocused
        {
            get { return _strokeIsFocused; }
            set
            {
                if (value != _strokeIsFocused)
                {
                    _strokeIsFocused = value;
                    OnPropertyChanged("strokeIsFocused");
                }
            }
        }

        private bool _dischargeIsFocused = false;
        /// <summary>
        /// represents the focused state of the discharge text box.
        /// Bindings: isFocused property updates this value. 
        /// </summary>
        public bool dischargeIsFocused
        {
            get { return _dischargeIsFocused; }
            set
            {
                if (value != _dischargeIsFocused)
                {
                    _dischargeIsFocused = value;
                    OnPropertyChanged("dischargeIsFocused");
                }
            }
        }

        private double _strokeWidth;
        /// <summary>
        /// This property represents the width of the stroke for this cell. 
        /// Binding: the view's object that represents the stroke binds one-way to this object, only getting the value
        /// </summary>
        public double strokeWidth
        {
            get { return _strokeWidth; }
            set
            {
                if (value != _strokeWidth)
                {
                    _strokeWidth = value;
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        CalculateBoxWidth("strokeWidth");
                        CalculateLeftOverhang("strokeWidth");
                        Calculate_rX("strokeWidth");
                        if (parent != null) { parent.CalculateBoxWidth("strokeWidth (from child)"); }
                        if (parent != null) { parent.Calculate_rX("strokeWidth (from child)"); }
                        foreach (var c in children) { c.Calculate_boxX("strokeWidth (from parent)"); }
                        OnPropertyChanged("strokeWidth");
                    }, null);
                    //CalculateBoxWidth("strokeWidth");
                    //CalculateLeftOverhang("strokeWidth");
                    //Calculate_rX("strokeWidth");
                    //if (parent != null) { parent.CalculateBoxWidth("strokeWidth (from child)"); }
                    //if (parent != null) { parent.Calculate_rX("strokeWidth (from child)"); }
                    //foreach (var c in children) { c.Calculate_boxX("strokeWidth (from parent)"); }
                    //OnPropertyChanged("strokeWidth");
                }
            }
        }

        public double _gridActualHeight;
        /// <summary>
        /// this property represents the width of the entire cell object. Used for calculations.
        /// Binding: is bound in OneWayToSource mode, meaning that the view object only sets this property. 
        /// </summary>
        public double gridActualHeight
        {
            get
            {
                string strToUse = "";
                if(cell.cellValue == "") { strToUse = " "; } else { strToUse = cell.cellValue; }
                return Math.Max(20, MeasureString(strToUse).Height);
            }
            
        }
        
        /// <summary>
        /// this property represents the width of the entire cell object, the negative discharge height not included. Used for calculations.
        /// Binding: is bound in OneWayToSource mode, meaning that the view object only sets this property. 
        /// </summary>
        public double gridActualWidth
        {
            get
            {

                var i = MeasureString(dischargeValue).Width + 5;
                return (i + Math.Max(strokeWidth, textWidth));
            }            
        }

        private Thickness _dischargeMargin;
        /// <summary>
        /// This property represents the position of the discharge for this cell. It is calculated in the negative discharge height property. 
        /// It is calculated to shift the margin up equal to half of the width of the discharge object, forcing it to be aligned
        /// in such a way so as to position the discharge off the end of the stroke.
        /// Binding: is bound to via One-Way binding. The view object only gets this, never setting it.
        /// </summary>
        public Thickness dischargeMargin
        {
            get { return _dischargeMargin; }
            set
            {
                if (value != _dischargeMargin)
                {
                    _dischargeMargin = value;
                    OnPropertyChanged("dischargeMargin");
                }
            }
        }

        public double _textWidth;
        /// <summary>
        /// This property represents the width that the textbox takes up visually. This cannot be calculated manually, as different letters
        /// and characters, combined with font size and other visual changes to the textbox would alter this. It is used for calculations. 
        /// Binding: is bound via OneWayToSource binding. the view object only sets it, never getting it.
        /// </summary>
        public double textWidth
        {
            get { return _textWidth; }
            set
            {
                if (value != _textWidth)
                {
                    _textWidth = value;

                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        CalculateStrokeWidth("textWidth");
                        CalculateBoxWidth("textWidth");
                        CalculateLastBoxRoom("textWidth");
                        CalculateLeftOverhang("textWidth");
                        CalculateRightOverhang("textWidth");
                        Calculate_boxX("textWidth");

                        if (parent != null) { parent.CalculateStrokeWidth("textWidth (from child)"); parent.CalculateBoxWidth("textWidth (from child)"); }
                        foreach (var c in children) { c.Calculate_boxX("textWidth (from parent)"); }
                        OnPropertyChanged("textWidth");
                    }, null);

                    //CalculateStrokeWidth("textWidth");
                    //CalculateBoxWidth("textWidth");
                    //CalculateLastBoxRoom("textWidth");
                    //CalculateLeftOverhang("textWidth");
                    //CalculateRightOverhang("textWidth");
                    //Calculate_boxX("textWidth");

                    //if (parent != null) { parent.CalculateStrokeWidth("textWidth (from child)"); parent.CalculateBoxWidth("textWidth (from child)"); }
                    //foreach (var c in children) { c.Calculate_boxX("textWidth (from parent)"); }
                    //OnPropertyChanged("textWidth");
                }
            }
        }

        private bool _dischargeIsVisible = true;
        /// <summary>
        /// This property represents whether the discharge text box is visible, or collapsed, meaning it takes up no room and is
        /// completely invisible on the view. This is to simulate 'adding' or 'removing' a discharge from the cell. 
        /// Binding: is bound via OneWay, the view object only gets the value, never setting it.
        /// </summary>
        public bool dischargeIsVisible
        {
            get { return _dischargeIsVisible; }
            set
            {
                if (_dischargeIsVisible != value)
                {
                    _dischargeIsVisible = value;
                    OnPropertyChanged("dischargeIsVisible");
                    OnPropertyChanged("children");
                }
            }
        }

        private Thickness _positionInProof;
        /// <summary>
        /// This property represents the cell object's position in the view. It is calculated by the algorithms used below. 
        /// It is based off the positions and sizes of other cells and their children and size and so on. 
        /// Binding: OneWay, the view object only gets the value never setting it.
        /// </summary>
        public Thickness positionInProof
        {
            get { return _positionInProof; }
            set
            {
                if (value != _positionInProof)
                {
                    if (Math.Abs(value.Left - _positionInProof.Left) > settings.differenceConstant || Math.Abs(value.Top - _positionInProof.Top) > settings.differenceConstant)
                    {
                        _positionInProof = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculateShouldBeVisible();
                            OnPropertyChanged("positionInProof");
                        }, null);
                        //CalculateShouldBeVisible();
                        //OnPropertyChanged("positionInProof");
                    }

                    _positionInProof = value;
                }
            }
        }

        private string _displayName = "untitled";
        public string displayName
        {
            get { return _displayName; }
            set
            {
                if (_displayName != value)
                {
                    _displayName = value;
                }
            }
        }

        #endregion

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            Application.Current.Dispatcher.Invoke(DispatcherPriority.Normal, new Action(
            () =>
            {
                var handler = PropertyChanged;
                if (handler != null) handler(this, new PropertyChangedEventArgs(propertyName));
            }));
            
        }

        # region Properties used by positioning calculations

        public double _negativeDischargeHeight;
        /// <summary>
        /// how far above the cell grid the discharge pokes up
        /// </summary>
        public double negativeDischargeHeight
        {
            get { return _negativeDischargeHeight; }
            set
            {
                //calculate what the margin's top would be
                double num = -(value / 2);
                //since negative discharge height stores the extra height on top of the grid, it's not negative
                if (Math.Abs(num) != _negativeDischargeHeight)
                {
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        //set the negative discharge height to the absolute value of num
                        _negativeDischargeHeight = Math.Abs(num);
                        CalculateBoxHeight("negativeDischargeHeight");
                        Calculate_rY("negativeDischargeHeight");
                        //set the discharge margin to the number (not the absolute value)
                        //the property set will call the property changed for it, no need.
                        dischargeMargin = new Thickness(0, num, 0, 0);
                        OnPropertyChanged("negativeDischargeHeight");
                    }, null);
                    ////set the negative discharge height to the absolute value of num
                    //_negativeDischargeHeight = Math.Abs(num);
                    //CalculateBoxHeight("negativeDischargeHeight");
                    //Calculate_rY("negativeDischargeHeight");
                    ////set the discharge margin to the number (not the absolute value)
                    ////the property set will call the property changed for it, no need.
                    //dischargeMargin = new Thickness(0, num, 0, 0);
                    //OnPropertyChanged("negativeDischargeHeight");
                }
            }
        }

        private double _firstBoxRoom;
        /// <summary>
        /// The amount of room that the box for this cell would take up if it was the first box in the list of children for its parent.
        /// </summary>
        public double firstBoxRoom
        {
            get { return _firstBoxRoom; }
            set
            {
                if (value != _firstBoxRoom)
                {
                    if(Math.Abs(value - _firstBoxRoom) > settings.differenceConstant)
                    {
                        _firstBoxRoom = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            if (parent != null) { parent.CalculateStrokeWidth("firstBoxRoom (from child)"); }
                            if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxX("firstBoxRoom (from sibling)"); } }
                            OnPropertyChanged("firstBoxRoom");
                        }, null);

                        //if (parent != null) { parent.CalculateStrokeWidth("firstBoxRoom (from child)"); }
                        //if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxX("firstBoxRoom (from sibling)"); } }
                        //OnPropertyChanged("firstBoxRoom");
                    }
                    _firstBoxRoom = value;
                }
            }
        }

        private double _lastBoxRoom;
        /// <summary>
        /// The amount of room that the box for this cell would take up if it was the last box in the list of children for its parent.
        /// </summary>
        public double lastBoxRoom
        {
            get { return _lastBoxRoom; }
            set
            {
                if (value != _lastBoxRoom)
                {
                    if (Math.Abs(value - _lastBoxRoom) > settings.differenceConstant)
                    {
                        _lastBoxRoom = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            if (parent != null) { parent.CalculateStrokeWidth("lastBoxRoom (from child)"); }
                            if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxX("lastBoxRoom (from sibling)"); } }
                            OnPropertyChanged("lastBoxRoom");
                        }, null);
                        //if (parent != null) { parent.CalculateStrokeWidth("lastBoxRoom (from child)"); }
                        //if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxX("lastBoxRoom (from sibling)"); } }
                        //OnPropertyChanged("lastBoxRoom");
                    }

                    _lastBoxRoom = value;                    
                }
            }
        }

        private double _boxWidth;
        /// <summary>
        /// The width of the box that contains this cell and all children
        /// </summary>
        public double boxWidth
        {
            get { return _boxWidth; }
            set
            {
                if (value != _boxWidth)
                {

                    if (Math.Abs(value - _boxWidth) > settings.differenceConstant)
                    {
                        _boxWidth = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculateFirstBoxRoom("boxWidth");
                            CalculateLastBoxRoom("boxWidth");
                            CalculateRightOverhang("boxWidth");
                            if (parent != null) { parent.CalculateStrokeWidth("boxWidth (from child)"); }
                            foreach (var c in children) { c.Calculate_boxX("boxWidth (from parent)"); }
                            if (parent != null) { foreach (var c in parent.children) { if (c != this) c.Calculate_boxX("boxWidth (from sibling)"); } }
                            OnPropertyChanged("boxWidth");
                        }, null);
                        //CalculateFirstBoxRoom("boxWidth");
                        //CalculateLastBoxRoom("boxWidth");
                        //CalculateRightOverhang("boxWidth");
                        //if (parent != null) { parent.CalculateStrokeWidth("boxWidth (from child)"); }
                        //foreach (var c in children) { c.Calculate_boxX("boxWidth (from parent)"); }
                        //if (parent != null) { foreach (var c in parent.children) { if (c != this) c.Calculate_boxX("boxWidth (from sibling)"); } }
                        //OnPropertyChanged("boxWidth");
                    }

                    _boxWidth = value;
                    
                }
            }
        }

        private double _boxHeight;
        /// <summary>
        /// The Height of the box that contains this cell and all its children
        /// </summary>
        public double boxHeight
        {
            get { return _boxHeight; }
            set
            {
                if (value != _boxHeight)
                {
                    if (Math.Abs(value - _boxHeight) > settings.differenceConstant)
                    {
                        _boxHeight = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            Calculate_boxY("boxHeight");
                            if (parent != null) { parent.CalculateBoxHeight("boxHeight (from child)"); }
                            if (parent != null) { parent.Calculate_rY("boxHeight (from child)"); }
                            foreach (var c in children) { c.Calculate_boxY("boxHeight (from parent)"); }
                            if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxY("boxHeight (from sibling)"); } }
                            OnPropertyChanged("boxHeight");
                        }, null);
                        //Calculate_boxY("boxHeight");
                        //if (parent != null) { parent.CalculateBoxHeight("boxHeight (from child)"); }
                        //if (parent != null) { parent.Calculate_rY("boxHeight (from child)"); }
                        //foreach (var c in children) { c.Calculate_boxY("boxHeight (from parent)"); }
                        //if (parent != null) { foreach (var c in parent.children) { c.Calculate_boxY("boxHeight (from sibling)"); } }
                        //OnPropertyChanged("boxHeight");
                    }

                    _boxHeight = value;                   
                }
            }
        }

        private double _leftOverhang;
        /// <summary>
        /// The amount of room that is taken up by the cell's children that are off the edge of the cell to the left
        /// </summary>
        public double leftOverhang
        {
            get { return _leftOverhang; }
            set
            {
                if (value != _leftOverhang)
                {
                    if (Math.Abs(value - _leftOverhang) > settings.differenceConstant)
                    {
                        _leftOverhang = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculateFirstBoxRoom("leftOverhang");
                            CalculateRightOverhang("leftOverhang");
                            Calculate_boxX("leftOverhang");
                            if (parent != null) { parent.CalculateBoxWidth("leftOverhang (from child)"); }
                            if (parent != null) { parent.Calculate_rX("leftOverhang (from child)"); }
                            OnPropertyChanged("leftOverhang");
                        }, null);
                        //CalculateFirstBoxRoom("leftOverhang");
                        //CalculateRightOverhang("leftOverhang");
                        //Calculate_boxX("leftOverhang");
                        //if (parent != null) { parent.CalculateBoxWidth("leftOverhang (from child)"); }
                        //if (parent != null) { parent.Calculate_rX("leftOverhang (from child)"); }
                        //OnPropertyChanged("leftOverhang");
                    }
                    _leftOverhang = value;
                }
            }
        }

        private double _rightOverhang;
        /// <summary>
        /// The amount of room that is taken up by the cell's children that are off the edge of the cell to the right
        /// </summary>
        public double rightOverhang
        {
            get { return _rightOverhang; }
            set
            {
                if (value != _rightOverhang)
                {
                    if (Math.Abs(value - _rightOverhang) > settings.differenceConstant)
                    {
                        _rightOverhang = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculateLastBoxRoom("rightOverhang");
                            if (parent != null) { parent.CalculateBoxWidth("rightOverhang (from child)"); }
                            OnPropertyChanged("rightOverhang");
                        }, null);
                        //CalculateLastBoxRoom("rightOverhang");
                        //if (parent != null) { parent.CalculateBoxWidth("rightOverhang (from child)"); }
                        //OnPropertyChanged("rightOverhang");
                    }
                    _rightOverhang = value;                    
                }
            }
        }

        private double _rX;
        /// <summary>
        /// The relative x of this cell
        /// </summary>
        public double rX
        {
            get { return _rX; }
            set
            {
                if (value != _rX)
                {
                    if (Math.Abs(value - _rX) > settings.differenceConstant)
                    {
                        _rX = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculateLeftOverhang("rX");
                            CalculatePositionInProof("rX");
                            if (parent != null) { parent.Calculate_rX("rX (from child)"); }
                            foreach (var c in children) { c.Calculate_boxX("rX (from parent)"); }
                            OnPropertyChanged("_rX");
                        }, null);
                        //CalculateLeftOverhang("rX");
                        //CalculatePositionInProof("rX");
                        //if (parent != null) { parent.Calculate_rX("rX (from child)"); }
                        //foreach (var c in children) { c.Calculate_boxX("rX (from parent)"); }
                        //OnPropertyChanged("_rX");
                    }
                    _rX = value;


                }
            }
        }

        private double _rY;
        /// <summary>
        /// The relative y of this cell
        /// </summary>
        public double rY
        {
            get { return _rY; }
            set
            {
                if (value != _rY)
                {
                    if (Math.Abs(value - _rY) > settings.differenceConstant)
                    {
                        _rY = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculatePositionInProof("rY");
                            OnPropertyChanged("rY");
                        }, null);
                        //CalculatePositionInProof("rY");
                        //OnPropertyChanged("rY");
                    }
                    _rY = value;
                }
            }
        }

        private double _boxX;
        /// <summary>
        /// The relative x of the box for this cell
        /// </summary>
        public double boxX
        {
            get { return _boxX; }
            set
            {
                if (value != _boxX)
                {
                    if (Math.Abs(value - _boxX) > settings.differenceConstant)
                    {
                        _boxX = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculatePositionInProof("boxX");
                            foreach (var c in children) { c.Calculate_boxX("boxX (from parent)"); }
                            if (parent != null) { foreach (var c in parent.children) { if (c != this) c.Calculate_boxX("boxX (from sibling)"); } }
                            OnPropertyChanged("boxX");
                        }, null);
                        //CalculatePositionInProof("boxX");
                        //foreach (var c in children) { c.Calculate_boxX("boxX (from parent)"); }
                        //if (parent != null) { foreach (var c in parent.children) { if (c != this) c.Calculate_boxX("boxX (from sibling)"); } }
                        //OnPropertyChanged("boxX");

                    }
                    _boxX = value;

                }
            }
        }

        private double _boxY;
        /// <summary>
        /// The relative y of the box for this cell
        /// </summary>
        public double boxY
        {
            get { return _boxY; }
            set
            {
                if (value != _boxY)
                {
                    if (Math.Abs(value - _boxY) > settings.differenceConstant)
                    {
                        _boxY = value;
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            CalculatePositionInProof("boxY");
                            foreach (var c in children) { c.Calculate_boxY("boxY (from parent)"); }
                            OnPropertyChanged("boxY");
                        }, null);
                        //CalculatePositionInProof("boxY");
                        //foreach (var c in children) { c.Calculate_boxY("boxY (from parent)"); }
                        //OnPropertyChanged("boxY");
                    }
                    _boxY = value;

                }
            }
        }

        #endregion

        #region Drag and Drop Properties

        //is being dragged
        //is 

        #endregion

        /// <summary>
        /// the list that represents the children of the cell. 
        /// </summary>
        private ObservableCollection<CellViewModel> _children = new ObservableCollection<CellViewModel>();
        public ObservableCollection<CellViewModel> children
        {
            get { return _children; }
            set
            {
                if (value != _children)
                {
                    _children = value;
                    OnPropertyChanged("children");
                }
            }
        }

        /// <summary>
        /// the cell that goes below it in positioning. may be null if there is no cell below it.
        /// </summary>
        private CellViewModel _parent;
        public CellViewModel parent
        {
            get { return _parent; }
            set
            {
                if (_parent != value)
                {
                    if (value != null)
                    {
                        
                        cell.parent = value.cell;
                        //we don't want to add this cell to the list of children for the new parent 
                        //as we don't know where the in the children it would go
                    }
                    else
                    {
                        //remove parent association
                        cell.parent = null;
                        //remove the cvm from the parent's list of cvms
                        parent.children.Remove(this);

                    }

                    _parent = value;
                    OnPropertyChanged("parent");
                }
            }
        }

        /// <summary>
        /// the proof view model that manages this cell view model
        /// </summary>
        private ProofViewModel _proofParent;
        public ProofViewModel proofParent
        {
            get { return _proofParent; }
            set
            {
                if (_proofParent != value)
                {
                    //remove the current cell from the proof's list of cells
                    if (_proofParent != null) { _proofParent.cells.Remove(this); }

                    //if the proofparent object doesn't have the cell already in the list, then go ahead and add it.
                    if (!value.cells.Contains(this)) { value.cells.Add(this); }
                    //do the same for the model data
                    if (!value.proof.cells.Contains(this.cell)) { value.proof.cells.Add(this.cell); }
                    //makes sure all children have gotten the new one as well- will create cascading effect through all children 
                    //also if it does get the new proof parent remove it from the old one 
                    foreach (var c in children)
                    {
                        if (c.proofParent != value)
                        {
                            if (c.proofParent != null)
                            {
                                c.proofParent.cells.Remove(this);
                            }
                            c.proofParent = value;
                        }

                    }
                    _proofParent = value;
                    OnPropertyChanged("proofParent");

                }
            }
        }

        #region Command Properties

        #region Cell Key Binding Commands

        public Command _moveToNewProof;
        public Command moveToNewProof
        {
            get
            {
                if (_moveToNewProof == null)
                {
                    _moveToNewProof = new Command(p => settings.moveToNewProof.enabled, moveToNewProofExecute);
                }

                return _moveToNewProof;
            }
        }

        #region Cell Value Text Box Key Bindings

        private Command _c_focus_Stroke;
        public Command c_focus_Stroke
        {
            get
            {
                if (_c_focus_Stroke == null)
                {
                    _c_focus_Stroke = new Command(p => settings.c_focus_Stroke.enabled, c_focus_StrokeExecute);
                }
                return _c_focus_Stroke;
            }
        }

        private Command _c_focus_make_Stroke;
        public Command c_focus_make_Stroke
        {
            get
            {
                if (_c_focus_make_Stroke == null)
                {
                    _c_focus_make_Stroke = new Command(p => settings.c_focus_make_Stroke.enabled, c_focus_make_StrokeExecute);
                }

                return _c_focus_make_Stroke;
            }
        }


        private Command _c_focus_ParentStroke;
        public Command c_focus_ParentStroke
        {
            get
            {
                if (_c_focus_ParentStroke == null)
                {
                    _c_focus_ParentStroke = new Command(p => settings.c_focus_ParentStroke.enabled, c_focus_ParentStrokeExecute);
                }

                return _c_focus_ParentStroke;
            }
        }

        private Command _c_focus_Make_ParentStroke;
        public Command c_focus_Make_ParentStroke
        {
            get
            {
                if (_c_focus_Make_ParentStroke == null)
                {
                    _c_focus_Make_ParentStroke = new Command(p => settings.c_focus_Make_ParentStroke.enabled, c_focus_Make_ParentStrokeExecute);
                }

                return _c_focus_Make_ParentStroke;
            }
        }

        private Command _c_focus_RightCell;
        public Command c_focus_RightCell
        {
            get
            {
                if (_c_focus_RightCell == null)
                {
                    _c_focus_RightCell = new Command(p => settings.c_focus_RightCell.enabled, c_focus_RightCellExecute);
                }

                return _c_focus_RightCell;
            }
        }

        private Command _c_focus_Make_RightCell;
        public Command c_focus_Make_RightCell
        {
            get
            {
                if (_c_focus_Make_RightCell == null)
                {
                    _c_focus_Make_RightCell = new Command(p => settings.c_focus_Make_RightCell.enabled, c_focus_Make_RightCellExecute);
                }

                return _c_focus_Make_RightCell;
            }
        }

        private Command _c_focus_LeftCell;
        public Command c_focus_LeftCell
        {
            get
            {
                if (_c_focus_LeftCell == null)
                {
                    _c_focus_LeftCell = new Command(p => settings.c_focus_LeftCell.enabled, c_focus_LeftCellExecute);
                }

                return _c_focus_LeftCell;
            }
        }

        private Command _c_focus_Make_LeftCell;
        public Command c_focus_Make_LeftCell
        {
            get
            {
                if (_c_focus_Make_LeftCell == null)
                {
                    _c_focus_Make_LeftCell = new Command(p => settings.c_focus_Make_LeftCell.enabled, c_focus_Make_LeftCellExecute);
                }

                return _c_focus_Make_LeftCell;
            }
        }

        private Command _c_focus_Home;
        public Command c_focus_Home
        {
            get
            {
                if (_c_focus_Home == null)
                {
                    _c_focus_Home = new Command(p => settings.c_focus_Home.enabled, c_focus_HomeExecute);
                }

                return _c_focus_Home;
            }
        }

        private Command _c_focus_Make_Home;
        public Command c_focus_Make_Home
        {
            get
            {
                if (_c_focus_Make_Home == null)
                {
                    _c_focus_Make_Home = new Command(p => settings.c_focus_Make_Home.enabled, c_focus_Make_HomeExecute);
                }

                return _c_focus_Make_Home;
            }
        }

        private Command _c_focus_End;
        public Command c_focus_End
        {
            get
            {
                if (_c_focus_End == null)
                {
                    _c_focus_End = new Command(p => settings.c_focus_End.enabled, c_focus_EndExecute);
                }

                return _c_focus_End;
            }
        }

        private Command _c_focus_Make_End;
        public Command c_focus_Make_End
        {
            get
            {
                if (_c_focus_Make_End == null)
                {
                    _c_focus_Make_End = new Command(p => settings.c_focus_Make_End.enabled, c_focus_Make_EndExecute);
                }

                return _c_focus_Make_End;
            }
        }

        private Command _c_remove_Cell;
        public Command c_remove_Cell
        {
            get
            {
                if (_c_remove_Cell == null)
                {
                    _c_remove_Cell = new Command(p => settings.c_remove_Cell.enabled, c_remove_CellExecute);
                }

                return _c_remove_Cell;
            }
        }

        private Command _c_removeCellStrong;
        public Command c_removeCellStrong
        {
            get
            {
                if (_c_removeCellStrong == null)
                {
                    _c_removeCellStrong = new Command(p => settings.c_removeCellStrong.enabled, c_removeCellStrongExecute);
                }

                return _c_removeCellStrong;
            }
        }

        #endregion

        #region Stroke Key Bindings

        private Command _s_focusFirstChildCell;
        public Command s_focusFirstChildCell
        {
            get
            {
                if (_s_focusFirstChildCell == null)
                {
                    _s_focusFirstChildCell = new Command(p => settings.s_focusFirstChildCell.enabled, s_focusFirstChildCellExecute);
                }

                return _s_focusFirstChildCell;
            }
        }

        private Command _s_makeLastChildCell;
        public Command s_makeLastChildCell
        {
            get
            {
                if (_s_makeLastChildCell == null)
                {
                    _s_makeLastChildCell = new Command(p => settings.s_makeLastChildCell.enabled, s_makeLastChildCellExecute);
                }

                return _s_makeLastChildCell;
            }
        }

        private Command _s_focusCell;
        public Command s_focusCell
        {
            get
            {
                if (_s_focusCell == null)
                {
                    _s_focusCell = new Command(p => settings.s_focusCell.enabled, s_focusCellExecute);
                }

                return _s_focusCell;
            }
        }

        private Command _s_focusDischarge;
        public Command s_focusDischarge
        {
            get
            {
                if (_s_focusDischarge == null)
                {
                    _s_focusDischarge = new Command(p => settings.s_focusDischarge.enabled, s_focusDischargeExecute);
                }

                return _s_focusDischarge;
            }
        }

        private Command _s_focusEnableDischarge;
        public Command s_focusEnableDischarge
        {
            get
            {
                if (_s_focusEnableDischarge == null)
                {
                    _s_focusEnableDischarge = new Command(p => settings.s_focusEnableDischarge.enabled, s_focusEnableDischargeExecute);
                }

                return _s_focusEnableDischarge;
            }
        }

        private Command _s_makeXChildren;
        public Command s_makeXChildren
        {
            get
            {
                if (_s_makeXChildren == null)
                {
                    _s_makeXChildren = new Command(p => settings.s_makeXChildren.enabled, s_makeXChildrenExecute);
                }

                return _s_makeXChildren;
            }
        }

        private Command _s_disableStroke;
        public Command s_disableStroke
        {
            get
            {
                if (_s_disableStroke == null)
                {
                    _s_disableStroke = new Command(p => settings.s_disableStroke.enabled, s_disableStrokeExecute);
                }

                return _s_disableStroke;
            }
        }

        #endregion

        #region Discharge Key Bindings

        private Command _d_focusStroke;
        public Command d_focusStroke
        {
            get
            {
                if (_d_focusStroke == null)
                {
                    _d_focusStroke = new Command(p => settings.d_focusStroke.enabled, d_focusStrokeExecute);
                }

                return _d_focusStroke;
            }
        }

        private Command _d_focusLastChild;
        public Command d_focusLastChild
        {
            get
            {
                if (_d_focusLastChild == null)
                {
                    _d_focusLastChild = new Command(p => settings.d_focusLastChild.enabled, d_focusLastChildExecute);
                }

                return _d_focusLastChild;
            }
        }

        private Command _d_makeLastChild;
        public Command d_makeLastChild
        {
            get
            {
                if (_d_makeLastChild == null)
                {
                    _d_makeLastChild = new Command(p => settings.d_makeLastChild.enabled, d_makeLastChildExecute);
                }

                return _d_makeLastChild;
            }
        }

        private Command _d_focusCell;
        public Command d_focusCell
        {
            get
            {
                if (_d_focusCell == null)
                {
                    _d_focusCell = new Command(p => settings.d_focusCell.enabled, d_focusCellExecute);
                }

                return _d_focusCell;
            }
        }

        private Command _d_disable;
        public Command d_disable
        {
            get
            {
                if (_d_disable == null)
                {
                    _d_disable = new Command(p => settings.d_disable.enabled, d_disableExecute);
                }

                return _d_disable;
            }
        }

        #endregion

        #endregion

        #endregion

        public CellViewModel()
        {
            children.CollectionChanged += MyItemsSource_CollectionChanged;
        }

        public void SpecialCharCheck()
        {
            foreach (var sc in settings.specialCharacters)
            {
                if (sc.escapeSequence != "None")
                {
                    if (cell.cellValue.Contains(sc.escapeSequence))
                    {
                        string str = cell.cellValue.Replace(sc.escapeSequence, sc.charToInsert.ToString());
                        cellValue = str;
                    }
                }
            }
        }

        public Size MeasureString(string candidate)
        {
            var formattedText = new FormattedText(
        candidate,
        CultureInfo.CurrentUICulture,
        FlowDirection.LeftToRight,
        new Typeface(settings.cellFontFamily, settings.cellFontStyle, settings.cellFontWeight, settings.cellFontStretch),
        settings.cellFontSize,
        settings.cellBrush);

            return new Size(formattedText.Width, formattedText.Height);
        }

        void MyItemsSource_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.NewItems != null)
            {
                foreach (CellViewModel item in e.NewItems)
                {
                    item.PropertyChanged += Cell_PropertyChanged;
                    //if it's cell is not in the list of children for the cell model add it
                    if (!cell.children.Contains(item.cell)) { cell.children.Add(item.cell); }
                    //if it's parent has not been set
                    if (item.parent != this) { item.parent = this; }
                }

            }

            if (e.OldItems != null)
            {
                foreach (CellViewModel item in e.OldItems)
                {
                    item.PropertyChanged -= Cell_PropertyChanged;
                    //updates the cell model accordingly
                    if (cell.children.Contains(item.cell)) { cell.children.Remove(item.cell); }
                    //if the parent is still associated, remove it
                    if (item.parent == this) { item.parent = null; }
                }

            }
            ThreadPool.QueueUserWorkItem(delegate
            {
                CalculateStrokeWidth("children count changed");
            }, null);

        }

        void Cell_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == "cellValue" || e.PropertyName == "dischargeValue")
            {
                OnPropertyChanged("children");
            }
        }

        public void CalculateShouldBeVisible()
        {

            if (proofParent != null)
            {
                Rect areaRect = new Rect();
                areaRect.Location = new Point(0,0);
                areaRect.Width = proofParent.scrollAreaActualWidth;
                areaRect.Height = proofParent.scrollAreaActualHeight;

                Rect cRect = new Rect();
                cRect.Location = new Point(
                    positionInProof.Left + proofParent.proofAreaThickness.Left - proofParent.horizScrollOffset,
                    positionInProof.Top + proofParent.proofAreaThickness.Top - proofParent.scrollOffset);
                cRect.Width = gridActualWidth;
                cRect.Height = gridActualHeight;

                if (cRect.IntersectsWith(areaRect))
                {
                    isVisible = true;
                }
                else
                {
                    isVisible = false;
                }
            }

        }

        #region Calculation Methods        

        int GetIndexFast(ObservableCollection<CellViewModel> oc, CellViewModel cvm)
        {
            for(int a = 0; a < oc.Count; a++)
            {
                if(cvm == oc[a])
                {
                    return a;
                }
            }

            return -1;
        }
        
        public void CalculateStrokeWidth(string methodThatCalled)
        {
            double num1 = -1;

            if (cell.children.Count == 0)
            {
                strokeWidth = textWidth;
                return;
            }
                    
            if (cell.children.Count == 1)
            {
                num1 = children[0].textWidth;
            }
                    
            if (cell.children.Count > 1)
            {
                //1 = padding room when it becomes a setting
                num1 = children[0].firstBoxRoom + children[children.Count - 1].lastBoxRoom + ((children.Count - 1) * 10);
                foreach (CellViewModel cvm in children)
                {
                    if (cvm != children[0] && cvm != children[children.Count - 1])
                    {
                        num1 += cvm.boxWidth;
                    }                            
                }                        
            }

            strokeWidth = Math.Max(textWidth, num1);            
        }
        
        public void CalculateBoxWidth(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                boxWidth = gridActualWidth;
            }

            if(children.Count == 1)
            {
                double leftOH_and_HalfStroke = (children[0].leftOverhang + (children[0].textWidth / 2));
                double halfStrokeWidth = strokeWidth / 2;

                //left overhang plus half of child stroke, or the stroke width, whichever's greater
                double leftSide = Math.Max(leftOH_and_HalfStroke, halfStrokeWidth);

                double rightOH_and_halfStroke = children[0].rightOverhang + (children[0].textWidth / 2);
                double halfStrokeAndGridWidthMinusTextWidth = (strokeWidth / 2) + (gridActualWidth - strokeWidth);

                //right overhang of child + half of child stroke width, or half of stroke width + 
                //the grid's actual width minus the text width, whichever's greater
                double rightSide = Math.Max(rightOH_and_halfStroke, halfStrokeAndGridWidthMinusTextWidth);

                //box width is equal to the left and the right side combined.
                boxWidth = leftSide + rightSide;
            }

            if(children.Count > 1)
            {
                //the stroke of this cell added to the first child's left overhang
                double strokeWidthAndFirstChildOH = strokeWidth + children[0].leftOverhang;

                //the last child's right over hang
                double lastChildRightOH = children[children.Count - 1].rightOverhang;

                //grid width subtracted from text width
                double gridWidthMinusTextWidth = gridActualWidth - strokeWidth;

                //box width is equal to the stroke width + the first child overhang + 
                //the last child's right overhang or the gridwidth - text width, whichever's greater
                boxWidth = strokeWidthAndFirstChildOH + Math.Max(lastChildRightOH, gridWidthMinusTextWidth);
            }
        }
        
        public void CalculateBoxHeight(string methodThatCalled)
        {            
            if (children.Count == 0)
            {
                //box's height is equal to the height of the grid added to how 
                if (dischargeIsVisible) { boxHeight = gridActualHeight + negativeDischargeHeight; } else { boxHeight = gridActualHeight; }
                
            }

            if(children.Count == 1)
            {
                //box's height is equal to the only child's box height and the size of the entire cell object.
                boxHeight = children[0].boxHeight + gridActualHeight;
            }

            if (children.Count > 1)
            {
                //the box height is equal to the tallest box of all the children's height plus the grid height.
                double greatestChildHeight = -1;

                foreach (CellViewModel c in children)
                {
                    greatestChildHeight = Math.Max(c.boxHeight, greatestChildHeight);
                }

                boxHeight = greatestChildHeight + gridActualHeight;
            }
        }
        
        public void CalculateFirstBoxRoom(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                firstBoxRoom = gridActualWidth;
            }

            if (children.Count == 1)
            {
                firstBoxRoom = boxWidth - leftOverhang;
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                firstBoxRoom = boxWidth - leftOverhang;
            }
        }
        
        public void CalculateLastBoxRoom(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                lastBoxRoom = textWidth;
            }

            if (children.Count == 1)
            {
                lastBoxRoom = boxWidth - rightOverhang;
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                lastBoxRoom = boxWidth - rightOverhang;
            }
        }
        
        public void CalculateLeftOverhang(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                leftOverhang = 0;
            }

            if (children.Count == 1)
            {
                leftOverhang = rX + ((strokeWidth - textWidth) / 2);
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                leftOverhang = rX + ((strokeWidth - textWidth) / 2);
            }
        }
        
        public void CalculateRightOverhang(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                rightOverhang = boxWidth - textWidth;
            }

            if (children.Count == 1)
            {
                rightOverhang = boxWidth - leftOverhang - textWidth;
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                rightOverhang = boxWidth - leftOverhang - textWidth;
            }
        }
        
        public void Calculate_rX(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                rX = 0;
            }

            if (children.Count == 1)
            {
                //rX is equal to the rX of the first child added to half its stroke width subtracted from half the stroke width of this cell, 
                //or 0, whichever is greater
                rX = Math.Max(((children[0].rX + (children[0].strokeWidth / 2)) - (strokeWidth / 2)), 0);
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                rX = children[0].leftOverhang;
            }
        }
        
        public void Calculate_rY(string methodThatCalled)
        {
            if (children.Count == 0)
            {
                if(dischargeIsVisible) { rY = negativeDischargeHeight; } else { rY = 0; }
            }

            if (children.Count == 1)
            {                
                rY = children[0].boxHeight;
            }
            //kept in 0/1/>1 cases format for easy reading.
            if (children.Count > 1)
            {
                //sets the relative y to the greatest child height.
                double greatestBoxHeight = -1;
                foreach(CellViewModel c in children)
                {
                    greatestBoxHeight = Math.Max(greatestBoxHeight, c.boxHeight);
                }

                rY = greatestBoxHeight;
            }
        }
        
        public void Calculate_boxX(string methodThatCalled)
        {
            if (parent != null)
            {
                if(parent.children.Count == 1)
                {
                    //the box's relative x is equal to the parent's box rX + the parent's rX + half the parent's troke width - 
                    //half the cell's text width - the left overhang 
                    boxX = parent.boxX + parent.rX + (parent.strokeWidth / 2) - (textWidth / 2) - leftOverhang;
                }

                if(parent.children.Count > 1)
                {
                    //if it's not the left most child
                    if (proofParent.cells.IndexOf(this) != 0)
                    {
                        //temp store the cell to the left of it for easy calc
                        var tempVM = parent.children[proofParent.cells.IndexOf(this) - 1];

                        //get the combined width of all above boxes, excluding first/last box
                        double allBoxWidths = 0;
                        foreach(var c in parent.children)
                        {
                            int indexOfC = GetIndexFast(parent.children, c);
                            if(indexOfC != 0 && indexOfC != parent.children.Count - 1)
                            {
                                allBoxWidths += c.boxWidth;
                            }
                        }

                        //add on first/last box room as appropriate
                        allBoxWidths += parent.children[0].firstBoxRoom;
                        allBoxWidths += parent.children[parent.children.Count - 1].lastBoxRoom;

                        //if the parent's text width is less that that that total size, including the padding that would go on there
                        if(parent.textWidth <= allBoxWidths + ((parent.children.Count - 1) * 10))
                        { 
                            //set the rX to the cell to the left of it's box Rx and its box Width + padding (10 here)
                            boxX = tempVM.boxX + tempVM.boxWidth + 10;
                        }
                        else
                        {
                            double newPadding = (parent.textWidth - allBoxWidths) / (parent.children.Count - 1);

                            //set the rX to the cell to the left of it's box Rx and its box Width + new padding
                            boxX = tempVM.boxX + tempVM.boxWidth + newPadding;
                        }                                              
                    }
                    else
                    {
                        boxX = parent.boxX;
                    }
                }
            }
            else
            {
                boxX = 0;
            }
        }
        
        public void Calculate_boxY(string methodThatCalled)
        {
            if (parent != null)
            {
                //gets the greatest box height of its siblings.
                double greatestSiblingBoxHeight = -1;
                foreach(var c in parent.children)
                {
                    greatestSiblingBoxHeight = Math.Max(greatestSiblingBoxHeight, c.boxHeight);
                }

                //sets it to the parent's boxY + greatest sibling height - box height.
                boxY = parent.boxY + greatestSiblingBoxHeight - boxHeight;
            }
            else
            {
                boxY = 0;
            }
        }
        
        public void CalculatePositionInProof(string methodThatCalled)
        {
             positionInProof = new Thickness(boxX + rX, boxY + rY, 0, 0);
        }

        #endregion

        #region Command Methods

        void moveToNewProofExecute(object parameter)
        {
            //we dont want the user making a new proof that literally consists of the entire current proof
            if(parent != null)
            {


                ProofModel pm = new ProofModel();
                ProofViewModel pvm = new ProofViewModel();
                pvm.mainVM = proofParent.mainVM;
                pvm.settings = settings;
                pvm.proof = pm;

                //this will cascade through cms and cvms
                proofParent = pvm;

                //this will correct the view model as well
                parent = null;

                proofParent.mainVM.proofs.Add(pvm);
                
            }
        }

        #region Cell Text Box Command Execute Methods

        void c_focus_StrokeExecute(object parameter)
        {
            if(strokeIsVisible)
                strokeIsFocused = true;
        }

        void  c_focus_make_StrokeExecute(object parameter)
        {
            if (strokeIsVisible)
            {
                strokeIsFocused = true;
            }
            else
            {
                strokeIsVisible = true;
                strokeIsFocused = true;
            }                
        }

        void c_focus_ParentStrokeExecute(object parameter)
        {
            if (parent != null)
                parent.strokeIsFocused = true;
        }
        void  c_focus_Make_ParentStrokeExecute(object parameter)
        {
            if(parent == null)
            {                
                CellModel c = new CellModel();

                CellViewModel cvm = new CellViewModel();
                cvm.settings = settings;
                //set the cell for this cvm to the new cell model
                cvm.cell = c;
                //set the parent of this cvm to the current proof parent
                cvm.proofParent = proofParent;
                //add the current cvm as a child to the new cvm
                cvm.children.Add(this);
                cvm.cellIsFocused = true;
                //all other associations are taken care of in their properties or in the events.

                
            }
            else
            {
                //otherwise move down to the parent
                parent.strokeIsFocused = true;
            }
        }

        void  c_focus_RightCellExecute(object parameter)
        {
            if(parent != null)
            {
                if(parent.children.Count > 1)
                {                    
                    //if its not the last cell in the list
                    if (proofParent.cells.IndexOf(this) != parent.children.Count - 1)
                    {
                        parent.children[proofParent.cells.IndexOf(this) + 1].cellIsFocused = true;
                    }
                }
            }
        }
        void  c_focus_Make_RightCellExecute(object parameter)
        {
            //if there's no parent, make one.
            if (parent == null)
            {
                CellModel cD = new CellModel();
                CellViewModel cvmD = new CellViewModel();
                cvmD.settings = settings;
                cvmD.cell = cD;
                cvmD.proofParent = this.proofParent;
                cvmD.children.Add(this);

            }

            //make a new cell next to the old one
            CellModel cR = new CellModel();
            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            cvm.cell = cR;
            cvm.proofParent = this.proofParent;
            cvm.cellIsFocused = true;
            if (proofParent.cells.IndexOf(this) != parent.children.Count - 1)
            {
                parent.children.Insert(proofParent.cells.IndexOf(this) + 1, cvm);
            }
            else
            {
                parent.children.Add(cvm);
            }
        }

        void  c_focus_LeftCellExecute(object parameter)
        {
            if (parent != null)
            {
                if (parent.children.Count > 1)
                {
                    //if its not the last cell in the list
                    if (proofParent.cells.IndexOf(this) != 0)
                    {
                        parent.children[proofParent.cells.IndexOf(this) - 1].cellIsFocused = true;
                    }
                }
            }
        }
        void  c_focus_Make_LeftCellExecute(object parameter)
        {
            //if there's no parent, make one.
            if (parent == null)
            {
                CellModel cD = new CellModel();
                CellViewModel cvmD = new CellViewModel();
                cvmD.settings = settings;
                cvmD.cell = cD;
                cvmD.proofParent = this.proofParent;
                cvmD.children.Add(this);

            }

            //make a new cell next to the old one
            CellModel cR = new CellModel();
            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            cvm.cell = cR;
            cvm.cellIsFocused = true;
            cvm.proofParent = this.proofParent;
            parent.children.Insert(proofParent.cells.IndexOf(this), cvm);
        }

        void  c_focus_HomeExecute(object parameter)
        {
            if(parent != null)
            {
                if(parent.children.Count > 1)
                {
                    if(proofParent.cells.IndexOf(this) != 0)
                    {
                        parent.children[0].cellIsFocused = true;
                    }
                }
            }
        }
        void  c_focus_Make_HomeExecute(object parameter)
        {
            //if there's no parent, make one.
            if (parent == null)
            {
                CellModel cD = new CellModel();
                CellViewModel cvmD = new CellViewModel();
                cvmD.settings = settings;
                cvmD.cell = cD;
                cvmD.proofParent = this.proofParent;
                cvmD.children.Add(this);

            }

            //make a new cell next to the old one
            CellModel cR = new CellModel();
            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            cvm.cellIsFocused = true;
            cvm.cell = cR;
            cvm.proofParent = this.proofParent;
            parent.children.Insert(0, cvm);
        }

        void  c_focus_EndExecute(object parameter)
        {
            if (parent != null)
            {
                if (parent.children.Count > 1)
                {
                    if (proofParent.cells.IndexOf(this) != parent.children.Count - 1)
                    {
                        parent.children[parent.children.Count - 1].cellIsFocused = true;
                    }
                }
            }
        }
        void  c_focus_Make_EndExecute(object parameter)
        {
            //if there's no parent, make one.
            if (parent == null)
            {
                CellModel cD = new CellModel();
                CellViewModel cvmD = new CellViewModel();
                cvmD.settings = settings;
                cvmD.cell = cD;
                cvmD.proofParent = this.proofParent;
                cvmD.children.Add(this);

            }

            //make a new cell next to the old one
            CellModel cR = new CellModel();
            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            cvm.cellIsFocused = true;
            cvm.cell = cR;
            cvm.proofParent = this.proofParent;
            parent.children.Add(cvm);
        }

        void  c_remove_CellExecute(object parameter)
        {
            if(parent == null)
            {
                if(children.Count == 1)
                {
                    children[0].cellIsFocused = true;
                    proofParent.cells.Remove(this);
                    children[0].parent = null;

                }
            }
            else
            {
                if(children.Count == 0)
                {                    
                    if(proofParent.cells.IndexOf(this) == parent.children.Count - 1)
                    {
                        if(parent.children.Count > 1)
                        {
                            parent.children[parent.children.Count - 1].cellIsFocused = true;
                        }
                        else
                        {
                            parent.cellIsFocused = true;
                        }
                    }
                    else
                    {
                        parent.children[proofParent.cells.IndexOf(this) + 1].cellIsFocused = true;
                    }
                    parent.children.Remove(this);
                    
                    proofParent.cells.Remove(this);                    
                }
            }
        }

        void  c_removeCellStrongExecute(object parameter)
        {
            //NYI
        }

        #endregion

        #region Stroke Key Bindings

        void  s_focusFirstChildCellExecute(object parameter)
        {
            if(children.Count > 0)
            {
                children[0].cellIsFocused = true;
            }
        }
        void s_makeLastChildCellExecute(object parameter)
        {
            CellModel c = new CellModel();

            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            //set the cell for this cvm to the new cell model
            cvm.cell = c;
            //set the parent of this cvm to the current proof parent
            cvm.proofParent = proofParent;
            //add the current cvm as a child to the new cvm
            children.Add(cvm);
            cvm.cellIsFocused = true;
            //all other associations are taken care of in their properties or in the events.
        }

        void s_focusCellExecute(object parameter)
        {
            cellIsFocused = true;
        }
        void s_focusDischargeExecute(object parameter)
        {
            if (dischargeIsVisible)
            {
                dischargeIsFocused = true;
            }
        }
        void s_focusEnableDischargeExecute(object parameter)
        {
            if(!dischargeIsVisible) { dischargeIsVisible = true; }
            dischargeIsFocused = true;
        }
        void s_makeXChildrenExecute(object parameter)
        {
            int amount = int.Parse(parameter.ToString());

            for(int a = 0; a < amount; a++)
            {
                CellModel c = new CellModel();

                CellViewModel cvm = new CellViewModel();
                cvm.settings = settings;
                //set the cell for this cvm to the new cell model
                cvm.cell = c;
                //set the parent of this cvm to the current proof parent
                cvm.proofParent = proofParent;
                //add the current cvm as a child to the new cvm
                children.Add(cvm);
                //all other associations are taken care of in their properties or in the events.
            }


            children[children.Count - 1].cellIsFocused = true;
        }
        void s_disableStrokeExecute(object parameter)
        {
            if(children.Count == 0 && !dischargeIsVisible)
            {
                strokeIsVisible = false;
                cellIsFocused = true;
            }
        }

        #endregion

        #region Discharge Key Bindings

        void d_focusStrokeExecute(object parameter)
        {
            strokeIsFocused = true;
        }

        void d_focusLastChildExecute(object parameter)
        {
            children[children.Count - 1].cellIsFocused = true;
        }
        void d_makeLastChildExecute(object parameter)
        {
            CellModel c = new CellModel();

            CellViewModel cvm = new CellViewModel();
            cvm.settings = settings;
            //set the cell for this cvm to the new cell model
            cvm.cell = c;
            //set the parent of this cvm to the current proof parent
            cvm.proofParent = proofParent;
            //add the current cvm as a child to the new cvm
            children.Add(cvm);
            //all other associations are taken care of in their properties or in the events.
            cvm.cellIsFocused = true;
        }

        void d_focusCellExecute(object parameter)
        {
            cellIsFocused = true;
        }
        void d_disableExecute(object parameter)
        {
            dischargeIsVisible = false;
            cellIsFocused = true;
        }

        #endregion

        #endregion
    }
}
