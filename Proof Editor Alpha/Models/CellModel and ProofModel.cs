using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Proof_Editor_Alpha
{
    public class CellModel
    {
        public string cellValue = "";
        public string dischargeValue = "";
        public bool strokeIsVisible = false;
        public CellModel parent;
        public List<CellModel> children = new List<CellModel>();
    }

    public class ProofModel
    {
        public static int newProofNameCounter = 0;
        public string proofName;
        public List<CellModel> cells = new List<CellModel>();

        public ProofModel()
        {
            newProofNameCounter++;
            proofName = "Untitled Proof " + newProofNameCounter;
        }
    }
}
