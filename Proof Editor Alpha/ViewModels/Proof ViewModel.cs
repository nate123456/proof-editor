using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;

namespace Proof_Editor_Alpha
{
    public class ProofViewModel : ViewModelBase
    {
        public ProofModel proof;

        public MainWindowViewModel mainVM;

        public Settings settings = new Settings();

        private double _scrollAreaActualWidth;
        public double scrollAreaActualWidth
        {
            get
            {
                return _scrollAreaActualWidth;
            }
            set
            {
                if (value != _scrollAreaActualWidth)
                {
                    _scrollAreaActualWidth = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("scrollAreaActualWidth");
                }
            }
        }

        private double _scrollAreaActualHeight;
        public double scrollAreaActualHeight
        {
            get
            {
                return _scrollAreaActualHeight;
            }
            set
            {
                if (value != _scrollAreaActualHeight)
                {
                    _scrollAreaActualHeight = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("scrollAreaActualHeight");
                }
            }
        }

        private double _scrollOffset;
        public double scrollOffset
        {
            get
            {
                return _scrollOffset;
            }
            set
            {
                if (value != _scrollOffset)
                {
                    _scrollOffset = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("scrollOffset");
                }
            }
        }

        private double _horizScrollOffset;
        public double horizScrollOffset
        {
            get
            {
                return _horizScrollOffset;
            }
            set
            {
                if (value != _horizScrollOffset)
                {
                    _horizScrollOffset = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("horizScrollOffset");
                }
            }
        }

        private double _proofAreaActualWidth;
        public double proofAreaActualWidth
        {
            get
            {
                return _proofAreaActualWidth;
            }
            set
            {
                if (value != _proofAreaActualWidth)
                {
                    _proofAreaActualWidth = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("proofAreaActualWidth");
                }
            }
        }

        private double _proofAreaActualHeight;
        public double proofAreaActualHeight
        {
            get
            {
                return _proofAreaActualHeight;
            }
            set
            {
                if (value != _proofAreaActualHeight)
                {
                    _proofAreaActualHeight = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("proofAreaActualHeight");
                }
            }
        }

        private Thickness _proofAreaThickness;
        public Thickness proofAreaThickness
        {
            get
            {
                return _proofAreaThickness;
            }
            set
            {
                if (value != _proofAreaThickness)
                {
                    _proofAreaThickness = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("proofAreaThickness");
                }
            }
        }

        public string proofName
        {
            get { return proof.proofName; }
            set
            {
                if (proof.proofName != value)
                {
                    proof.proofName = value;
                    foreach (var c in cells) { c.CalculateShouldBeVisible(); }
                    OnPropertyChanged("proofName");
                }
            }
        }

        public ProofViewModel()
        {
            cells.CollectionChanged += MyItemsSource_CollectionChanged;
        }

        private ObservableCollection<CellViewModel> _cells = new ObservableCollection<CellViewModel>();

        public ObservableCollection<CellViewModel> cells
        {
            get { return _cells; }
            set
            {
                if (_cells != value)
                {
                    _cells = value;
                    OnPropertyChanged("cells");
                }
            }
        }

        void MyItemsSource_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.NewItems != null)
            {
                foreach (CellViewModel item in e.NewItems)
                {
                    item.PropertyChanged += Proof_PropertyChanged;
                    if (!proof.cells.Contains(item.cell)) { proof.cells.Add(item.cell); }
                }

                foreach (var c in cells) { c.CalculateShouldBeVisible(); }
            }

            if (e.OldItems != null)
            {
                foreach (CellViewModel item in e.OldItems)
                {
                    item.PropertyChanged -= Proof_PropertyChanged;
                    if(proof.cells.Contains(item.cell)) { proof.cells.Remove(item.cell); }
                }

                foreach (var c in cells) { c.CalculateShouldBeVisible(); }
            }
        }

        void Proof_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == "boxWidth" || e.PropertyName == "cellValue" || e.PropertyName == "dischargeValue")
            {
                OnPropertyChanged("children");
            }
        }

        void Initialize()
        {

        }
    }
}
