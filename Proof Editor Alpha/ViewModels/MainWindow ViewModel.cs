using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace Proof_Editor_Alpha
{
    public class MainWindowViewModel : ViewModelBase
    {
        public Settings settings;        

        public ObservableCollection<ProofViewModel> _proofs = new ObservableCollection<ProofViewModel>();       

        public ObservableCollection<ProofViewModel> proofs
        {
            get { return _proofs; }
            set
            {
                if(_proofs != value)
                {
                    _proofs = value;
                    OnPropertyChanged("proofs");
                }
            }
        }

        private ProofViewModel _dragProof;
        public ProofViewModel dragProof
        {
            get { return _dragProof; }
            set
            {
                if(value != _dragProof)
                {
                    _dragProof = value;
                    OnPropertyChanged("dragProof");
                }
            }
        }

        private double _mX;
        public double mX
        {
            get { return _mX; }
            set
            {
                if(_mX != value)
                {
                    _mX = value;
                    CalculateDragProofPosition();
                    OnPropertyChanged("mX");
                }
            }
        }

        private double _mY;
        public double mY
        {
            get { return _mY; }
            set
            {
                if (_mY != value)
                {
                    _mY = value;
                    CalculateDragProofPosition();
                    OnPropertyChanged("mY");
                }
            }
        }

        public double _gridActualHeight;
        public double gridActualHeight
        {
            get { return _gridActualHeight; }
            set
            {
                if (value != _gridActualHeight)
                {
                    _gridActualHeight = value;
                    CalculateDragProofPosition();
                    OnPropertyChanged("gridActualHeight");
                }
            }
        }

        public double _gridActualWidth;
        public double gridActualWidth
        {
            get { return _gridActualWidth; }
            set
            {
                if (value != _gridActualWidth)
                {
                    _gridActualWidth = value;
                    CalculateDragProofPosition();
                    OnPropertyChanged("gridActualWidth");
                }
            }
        }

        private Thickness _dragProofPosition;
        public Thickness dragProofPosition
        {
            get { return _dragProofPosition; }
            set
            {
                if (_dragProofPosition != value)
                {
                    _dragProofPosition = value;
                    OnPropertyChanged("dragProofPosition");
                }
            }
        }

        void CalculateDragProofPosition()
        {
            if(dragProof != null)
            {
                dragProofPosition = new Thickness(mX - (gridActualWidth / 2), mY - gridActualHeight, 0, 0);
            }
        }

        public MainWindowViewModel()
        {
            _proofs.CollectionChanged += MyItemsSource_CollectionChanged;
            settings = new Settings();
            Initialize();
        }

        void MyItemsSource_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.NewItems != null)
                foreach (ProofViewModel item in e.NewItems)
                    item.PropertyChanged += MainWindow_PropertyChanged;

            if (e.OldItems != null)
                foreach (ProofViewModel item in e.OldItems)
                    item.PropertyChanged -= MainWindow_PropertyChanged;

        }

        void MainWindow_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == "boxWidth" || e.PropertyName == "cellValue" || e.PropertyName == "dischargeValue")
            {
                OnPropertyChanged("children");
            }
        }

        void Initialize(string path = "")
        {
            ProofViewModel p = ConvertToViewModel(ImportProofSimulate());
            ProofViewModel p1 = ConvertToViewModel(ImportProofSimulate());

            proofs.Add(p);
            proofs.Add(p1);
        }

        ProofViewModel ConvertToViewModel(ProofModel p)
        {
            ProofViewModel pvm = new ProofViewModel();
            pvm.proof = p;
            pvm.mainVM = this;
            List<CellViewModel> cvms = new List<CellViewModel>();

            //go through all cell models, create a blank cell view model, assigning only the cell object
            foreach(var c in p.cells)
            {
                CellViewModel cvm = new CellViewModel();
                cvm.settings = settings;
                cvm.cell = c;
                cvms.Add(cvm);
            }            

            //go through all cvms. 
            foreach(var c in cvms)
            {
                //if there's a parent
                if(c.cell.parent != null)
                {
                    //find the parent cvm
                    foreach (var c0 in cvms)
                    {
                        //once its been found
                        if(c0.cell == c.cell.parent)
                        {
                            //set the cvm parent to the correct cvm
                            c.parent = c0;                            
                        }
                    }
                }

                //if this cell has children
                if(c.cell.children.Count > 0)
                {
                    for(int a = 0; a < c.cell.children.Count; a++)
                    {
                        //go through all cmvs
                        foreach (var c1 in cvms)
                        {
                            //find the matching cvm
                            if (c1.cell == c.cell.children[a])
                            {
                                //add it to the list of children
                                c.children.Add(c1);
                            }
                        }
                    }                    
                }

                c.proofParent = pvm;
                
            }

            pvm.cells = new ObservableCollection<CellViewModel>(cvms);

            return pvm;
        }

        ProofModel ImportProofSimulate()
        {
            //CellModel cU0 = new CellModel();
            //cU0.cellValue = "upper 1";
            //CellModel cU1 = new CellModel();
            //cU1.cellValue = "upper 2";
            //CellModel cU2 = new CellModel();
            //cU2.cellValue = "upper 3";

            CellModel c = new CellModel();
            c.cellValue = "empty test cell";
            //CellModel c0 = new CellModel();
            //c0.cellValue = "left cell";
            //c0.parent = c;
            //c.children.Add(c0);
            //CellModel c1 = new CellModel();
            //c1.cellValue = "right cell";
            //c1.parent = c;
            //c1.children.Add(cU0);
            //c1.children.Add(cU1);
            //c1.children.Add(cU2);
            //cU0.parent = c1;
            //cU1.parent = c1;
            //cU2.parent = c1;
            //c.children.Add(c1);

            ProofModel p = new ProofModel();
            p.cells.Add(c);
            //p.cells.Add(c0);
            //p.cells.Add(c1);
            //p.cells.Add(cU0);
            //p.cells.Add(cU1);
            //p.cells.Add(cU2);

            return p;
        }
    }
}
