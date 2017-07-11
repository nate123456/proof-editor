using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Proof_Editor_Alpha
{
    public abstract class ViewModelBase : INotifyPropertyChanged
    {
        private string _displayName = "untitled";
        public string displayName
        {
            get { return _displayName; }
            set
            {
                if(_displayName != value)
                {
                    _displayName = value;
                }
            }
        }
            
        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            var handler = PropertyChanged;
            if (handler != null) handler(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
