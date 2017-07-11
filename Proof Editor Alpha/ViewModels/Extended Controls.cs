using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Collections.Specialized;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using System.Diagnostics;

namespace Proof_Editor_Alpha
{
    public class ExtendedGrid : Grid
    {
        public ExtendedGrid()
          : base()
        {
            this.SizeChanged += new SizeChangedEventHandler(ExtendedGrid_SizeChanged);
            this.IsVisibleChanged += new DependencyPropertyChangedEventHandler(ExtendedUserControl_IsVisibleChanged);
        }

        void ExtendedUserControl_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            BindableisVisible = this.IsVisible;
        }
        public bool BindableisVisible
        {
            get { return (bool)GetValue(BindableIsVisibleProperty); }
            set { SetValue(BindableIsVisibleProperty, value); }
        }


        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableIsVisibleProperty =
          DependencyProperty.Register("BindableisVisible", typeof(bool), typeof(ExtendedGrid),
          new PropertyMetadata(true));

        void ExtendedGrid_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BindableActualHeight = this.ActualHeight;
            BindableActualWidth = this.ActualWidth;
        }

        public double BindableActualWidth
        {
            get { return (double)GetValue(BindableActualWidthProperty); }
            set { SetValue(BindableActualWidthProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualWidthProperty =
          DependencyProperty.Register("BindableActualWidth", typeof(double), typeof(ExtendedGrid),
          new PropertyMetadata(0d));

        public double BindableActualHeight
        {
            get { return (double)GetValue(BindableActualHeightProperty); }
            set { SetValue(BindableActualHeightProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualHeight. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualHeightProperty =
          DependencyProperty.Register("BindableActualHeight", typeof(double), typeof(ExtendedGrid),
          new PropertyMetadata(0d));
    }

    public class VirtualizingGrid : Grid
    {
        public VirtualizingGrid()
        {
            this.SizeChanged += new SizeChangedEventHandler(SizeChangedVirtualize);
        }

        public void SizeChangedVirtualize(object sender, SizeChangedEventArgs e)
        {
            VirtualizingGrid g = sender as VirtualizingGrid;
            FrameworkElement parent = (FrameworkElement)g.VisualParent;
            FrameworkElement parentOfParent = (FrameworkElement)parent.TemplatedParent;
            FrameworkElement parentOfParentOfParent = (FrameworkElement)parentOfParent.Parent;
            FrameworkElement parentOfParentOfParentOfParent = (FrameworkElement)parentOfParentOfParent.Parent;
            if (parentOfParentOfParentOfParent != null)
            {
                double gridX = g.Margin.Left;
                double gridY = g.Margin.Top;

                //area that represents the grid's parent, where things will be cropped by it 'out of visibility'
                Rect parentRect = new Rect();
                parentRect.Location = new Point(0, 0);
                parentRect.Width = parent.ActualWidth;
                parentRect.Height = parent.ActualHeight;

                ItemsControl i = (ItemsControl)parentOfParent;
                ItemContainerGenerator icg = i.ItemContainerGenerator;
                foreach(var item in i.Items)
                {
                    FrameworkElement e0 = (FrameworkElement)icg.ContainerFromItem(item);

                    //represents the area that the object takes up in the grid's encompassing element
                    Rect eRect = new Rect();
                    eRect.Location = new Point(gridX + e0.Margin.Left, gridY + e0.Margin.Top);

                    eRect.Width = e0.ActualWidth;
                    eRect.Height = e0.ActualHeight;

                    //if the two rectangles intersect, the it should be made visible, otherwise make it invisible/collapsed to save render.
                    if (!eRect.IntersectsWith(parentRect))
                    {
                        e0.Visibility = Visibility.Hidden;
                    }
                    else
                    {
                        e0.Visibility = Visibility.Visible;
                    }
                }

                //foreach (FrameworkElement e0 in g.Children)
                //{
                //    if (e0.IsKeyboardFocused || e0.IsFocused)
                //    {
                        
                //    }

                    
                //}
            }
        }
    }

    public class ExtendedTextBox : TextBox
    {
        public ExtendedTextBox()
          : base()
        {
            this.SizeChanged += new SizeChangedEventHandler(ExtendedTextBox_SizeChanged);
        }

        void ExtendedTextBox_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BindableActualHeight = this.ActualHeight;
            BindableActualWidth = this.ActualWidth;
        }
        public double BindableActualWidth
        {
            get { return (double)GetValue(BindableActualWidthProperty); }
            set { SetValue(BindableActualWidthProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualWidthProperty =
          DependencyProperty.Register("BindableActualWidth", typeof(double), typeof(ExtendedTextBox),
          new PropertyMetadata(0d));

        

        public double BindableActualHeight
        {
            get { return (double)GetValue(BindableActualHeightProperty); }
            set { SetValue(BindableActualHeightProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualHeight. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualHeightProperty =
          DependencyProperty.Register("BindableActualHeight", typeof(double), typeof(ExtendedTextBox),
          new PropertyMetadata(0d));
    }

    public class ExtendedBorder : Border
    {
        public ExtendedBorder()
          : base()
        {
            this.SizeChanged += new SizeChangedEventHandler(ExtendedBorder_SizeChanged);
        }

        void ExtendedBorder_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BindableActualHeight = this.ActualHeight;
            BindableActualWidth = this.ActualWidth;
        }

        public double BindableActualWidth
        {
            get { return (double)GetValue(BindableActualWidthProperty); }
            set { SetValue(BindableActualWidthProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualWidthProperty =
          DependencyProperty.Register("BindableActualWidth", typeof(double), typeof(ExtendedBorder),
          new PropertyMetadata(0d));

        public double BindableActualHeight
        {
            get { return (double)GetValue(BindableActualHeightProperty); }
            set { SetValue(BindableActualHeightProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualHeight. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualHeightProperty =
          DependencyProperty.Register("BindableActualHeight", typeof(double), typeof(ExtendedBorder),
          new PropertyMetadata(0d));
    }

    public static class FocusExtension
    {
        public static readonly DependencyProperty IsFocusedProperty =
            DependencyProperty.RegisterAttached("IsFocused", typeof(bool?), typeof(FocusExtension), new FrameworkPropertyMetadata(IsFocusedChanged));

        public static bool? GetIsFocused(DependencyObject element)
        {
            if (element == null)
            {
                throw new ArgumentNullException("element");
            }

            return (bool?)element.GetValue(IsFocusedProperty);
        }

        public static void SetIsFocused(DependencyObject element, bool? value)
        {
            if (element == null)
            {
                throw new ArgumentNullException("element");
            }

            element.SetValue(IsFocusedProperty, value);
        }

        private static void IsFocusedChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var fe = (FrameworkElement)d;

            if (e.OldValue == null)
            {
                fe.GotFocus += FrameworkElement_GotFocus;
                fe.LostFocus += FrameworkElement_LostFocus;
            }

            if (!fe.IsVisible)
            {
                fe.IsVisibleChanged += new DependencyPropertyChangedEventHandler(fe_IsVisibleChanged);
            }

            if ((bool)e.NewValue)
            {
                fe.Focus();
            }
        }

        private static void fe_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            var fe = (FrameworkElement)sender;
            if (fe.IsVisible && (bool)((FrameworkElement)sender).GetValue(IsFocusedProperty))
            {
                fe.IsVisibleChanged -= fe_IsVisibleChanged;
                fe.Focus();
            }
        }

        private static void FrameworkElement_GotFocus(object sender, RoutedEventArgs e)
        {
            ((FrameworkElement)sender).SetValue(IsFocusedProperty, true);
        }

        private static void FrameworkElement_LostFocus(object sender, RoutedEventArgs e)
        {
            ((FrameworkElement)sender).SetValue(IsFocusedProperty, false);
        }
    }

    public class InputBindingsBehavior
    {
        public static readonly DependencyProperty TakesInputBindingPrecedenceProperty =
            DependencyProperty.RegisterAttached("TakesInputBindingPrecedence", typeof(bool), typeof(InputBindingsBehavior), new UIPropertyMetadata(false, OnTakesInputBindingPrecedenceChanged));

        public static bool GetTakesInputBindingPrecedence(UIElement obj)
        {
            return (bool)obj.GetValue(TakesInputBindingPrecedenceProperty);
        }

        public static void SetTakesInputBindingPrecedence(UIElement obj, bool value)
        {
            obj.SetValue(TakesInputBindingPrecedenceProperty, value);
        }

        private static void OnTakesInputBindingPrecedenceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            ((UIElement)d).PreviewKeyDown += new KeyEventHandler(InputBindingsBehavior_PreviewKeyDown);
        }

        private static void InputBindingsBehavior_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            var uielement = (UIElement)sender;

            var foundBinding = uielement.InputBindings
                .OfType<KeyBinding>()
                .FirstOrDefault(kb => kb.Key == e.Key && kb.Modifiers == e.KeyboardDevice.Modifiers);

            if(e.Key == Key.Left)
            {

            }
            if (foundBinding != null)
            {
                e.Handled = true;
                if (foundBinding.Command.CanExecute(foundBinding.CommandParameter))
                {
                    foundBinding.Command.Execute(foundBinding.CommandParameter);
                }
            }

            if(uielement is ExtendedBorder)
            {
                e.Handled = true;
            }
        }
    }

    public class MouseBehaviour : System.Windows.Interactivity.Behavior<Panel>
    {
        public static readonly DependencyProperty MouseYProperty = DependencyProperty.Register(
            "MouseY", typeof(double), typeof(MouseBehaviour), new PropertyMetadata(default(double)));

        public double MouseY
        {
            get { return (double)GetValue(MouseYProperty); }
            set { SetValue(MouseYProperty, value); }
        }

        public static readonly DependencyProperty MouseXProperty = DependencyProperty.Register(
            "MouseX", typeof(double), typeof(MouseBehaviour), new PropertyMetadata(default(double)));

        public double MouseX
        {
            get { return (double)GetValue(MouseXProperty); }
            set { SetValue(MouseXProperty, value); }
        }

        protected override void OnAttached()
        {
            AssociatedObject.MouseMove += AssociatedObjectOnMouseMove;
        }

        private void AssociatedObjectOnMouseMove(object sender, MouseEventArgs mouseEventArgs)
        {
            var pos = mouseEventArgs.GetPosition(AssociatedObject);
            MouseX = pos.X;
            MouseY = pos.Y;
        }

        protected override void OnDetaching()
        {
            AssociatedObject.MouseMove -= AssociatedObjectOnMouseMove;
        }
    }

    public class ExtendedScrollViewer : ScrollViewer
    {
        public ExtendedScrollViewer()
          : base()
        {
            this.SizeChanged += new SizeChangedEventHandler(ExtendedScrollViewer_SizeChanged);
            this.ScrollChanged += new ScrollChangedEventHandler(ExtendedScrollViewerScrollPositionHandler);
        }

        void ExtendedScrollViewer_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BindableActualHeight = this.ActualHeight;
            BindableActualWidth = this.ActualWidth;
        }

        void ExtendedScrollViewerScrollPositionHandler(object sender, ScrollChangedEventArgs e)
        {
            BindableScrollPosition = this.VerticalOffset;
            BindableHorizScrollPosition = this.HorizontalOffset;
        }

        public double BindableActualWidth
        {
            get { return (double)GetValue(BindableActualWidthProperty); }
            set { SetValue(BindableActualWidthProperty, value); }
        }

        public double BindableScrollPosition
        {
            get { return (double)GetValue(BindableScrollPositionProperty); }
            set { SetValue(BindableScrollPositionProperty, value); }
        }

        public double BindableHorizScrollPosition
        {
            get { return (double)GetValue(BindableHorizScrollPositionProperty); }
            set { SetValue(BindableHorizScrollPositionProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualWidthProperty =
          DependencyProperty.Register("BindableActualWidth", typeof(double), typeof(ExtendedScrollViewer),
          new PropertyMetadata(0d));

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableScrollPositionProperty =
          DependencyProperty.Register("BindableScrollPosition", typeof(double), typeof(ExtendedScrollViewer),
          new PropertyMetadata(0d));

        // Using a DependencyProperty as the backing store for BindableActualWidth. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableHorizScrollPositionProperty =
          DependencyProperty.Register("BindableHorizScrollPosition", typeof(double), typeof(ExtendedScrollViewer),
          new PropertyMetadata(0d));

        public double BindableActualHeight
        {
            get { return (double)GetValue(BindableActualHeightProperty); }
            set { SetValue(BindableActualHeightProperty, value); }
        }

        // Using a DependencyProperty as the backing store for BindableActualHeight. This enables animation, styling, binding, etc...
        public static readonly DependencyProperty BindableActualHeightProperty =
          DependencyProperty.Register("BindableActualHeight", typeof(double), typeof(ExtendedScrollViewer),
          new PropertyMetadata(0d));
    }

}
