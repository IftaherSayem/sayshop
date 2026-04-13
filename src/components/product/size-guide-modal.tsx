'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ruler, Lightbulb, Shirt, Scissors, Footprints } from 'lucide-react';

interface SizeGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Size Data ────────────────────────────────────────────────────
type SizeRow = { size: string; chest?: string; waist?: string; length?: string; hips?: string; inseam?: string; usMen?: string; usWomen?: string; uk?: string; eu?: string; cm?: string };

const TOPS_DATA: SizeRow[] = [
  { size: 'XS', chest: '32-34', waist: '24-26', length: '26', hips: '34-36' },
  { size: 'S', chest: '34-36', waist: '26-28', length: '27', hips: '36-38' },
  { size: 'M', chest: '38-40', waist: '28-30', length: '28', hips: '38-40' },
  { size: 'L', chest: '40-42', waist: '30-32', length: '29', hips: '40-42' },
  { size: 'XL', chest: '42-44', waist: '32-34', length: '30', hips: '42-44' },
  { size: 'XXL', chest: '46-48', waist: '36-38', length: '31', hips: '46-48' },
];

const BOTTOMS_DATA: SizeRow[] = [
  { size: 'XS', waist: '24-26', hips: '34-36', inseam: '30' },
  { size: 'S', waist: '26-28', hips: '36-38', inseam: '31' },
  { size: 'M', waist: '28-30', hips: '38-40', inseam: '32' },
  { size: 'L', waist: '30-32', hips: '40-42', inseam: '32' },
  { size: 'XL', waist: '32-34', hips: '42-44', inseam: '33' },
  { size: 'XXL', waist: '36-38', hips: '46-48', inseam: '33' },
];

const SHOES_DATA: SizeRow[] = [
  { size: 'XS', usMen: '6', usWomen: '7.5', uk: '5.5', eu: '39', cm: '25' },
  { size: 'S', usMen: '7.5', usWomen: '9', uk: '7', eu: '40.5', cm: '26' },
  { size: 'M', usMen: '9', usWomen: '10.5', uk: '8.5', eu: '42', cm: '27' },
  { size: 'L', usMen: '10.5', usWomen: '12', uk: '10', eu: '43.5', cm: '28' },
  { size: 'XL', usMen: '12', usWomen: '13.5', uk: '11.5', eu: '45', cm: '29' },
  { size: 'XXL', usMen: '13', usWomen: '14.5', uk: '12.5', eu: '46', cm: '30' },
];

const MEASURING_STEPS = [
  {
    title: 'Chest',
    description: 'Measure around the fullest part of your chest, keeping the tape level under your arms and across your shoulder blades.',
    icon: Shirt,
  },
  {
    title: 'Waist',
    description: 'Measure around your natural waistline — the narrowest part of your torso, usually about 1 inch above your belly button.',
    icon: Scissors,
  },
  {
    title: 'Hips',
    description: 'Stand with feet together and measure around the fullest part of your hips and buttocks, approximately 8 inches below your waist.',
    icon: Ruler,
  },
];

const TIPS = [
  'Wear light clothing or underwear when measuring for the most accurate results.',
  'Use a flexible tape measure and keep it snug but not tight.',
  'Have someone help you measure for better accuracy, especially for chest and back.',
  'Measure yourself at the end of the day for foot sizing — feet tend to swell slightly.',
  'If you\'re between sizes, we recommend sizing up for a more comfortable fit.',
  'Compare your measurements to the chart above and choose the closest size.',
];

export function SizeGuideModal({ open, onOpenChange }: SizeGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ruler className="h-5 w-5 text-orange-500" />
            Size Guide
          </DialogTitle>
          <DialogDescription>
            Find your perfect fit with our comprehensive size charts and measuring guide.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Size Charts Tabs */}
          <Tabs defaultValue="tops" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tops" className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Shirt className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tops</span>
              </TabsTrigger>
              <TabsTrigger value="bottoms" className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Scissors className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bottoms</span>
              </TabsTrigger>
              <TabsTrigger value="shoes" className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Footprints className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Shoes</span>
              </TabsTrigger>
            </TabsList>

            {/* Tops */}
            <TabsContent value="tops" className="mt-4">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Size</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Chest (in)</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Waist (in)</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Length (in)</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Hips (in)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TOPS_DATA.map((row) => (
                      <TableRow key={row.size}>
                        <TableCell className="font-semibold">{row.size}</TableCell>
                        <TableCell>{row.chest}</TableCell>
                        <TableCell>{row.waist}</TableCell>
                        <TableCell>{row.length}</TableCell>
                        <TableCell>{row.hips}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                All measurements are in inches. For the best fit, take your measurements and compare with the chart above.
              </p>
            </TabsContent>

            {/* Bottoms */}
            <TabsContent value="bottoms" className="mt-4">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Size</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Waist (in)</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Hips (in)</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Inseam (in)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BOTTOMS_DATA.map((row) => (
                      <TableRow key={row.size}>
                        <TableCell className="font-semibold">{row.size}</TableCell>
                        <TableCell>{row.waist}</TableCell>
                        <TableCell>{row.hips}</TableCell>
                        <TableCell>{row.inseam}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                All measurements are in inches. Inseam is measured from the crotch to the bottom of the leg.
              </p>
            </TabsContent>

            {/* Shoes */}
            <TabsContent value="shoes" className="mt-4">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">Size</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">US Men</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">US Women</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">UK</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">EU</TableHead>
                      <TableHead className="text-orange-600 dark:text-orange-400 font-semibold">CM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SHOES_DATA.map((row) => (
                      <TableRow key={row.size}>
                        <TableCell className="font-semibold">{row.size}</TableCell>
                        <TableCell>{row.usMen}</TableCell>
                        <TableCell>{row.usWomen}</TableCell>
                        <TableCell>{row.uk}</TableCell>
                        <TableCell>{row.eu}</TableCell>
                        <TableCell>{row.cm}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Shoe sizes may vary by brand. If you&apos;re between sizes, we recommend going up half a size.
              </p>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="border-t" />

          {/* How to Measure Section */}
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
              <Ruler className="h-4 w-4 text-orange-500" />
              How to Measure
            </h3>
            <div className="space-y-4">
              {MEASURING_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 text-xs px-2 py-0">
                          Step {index + 1}
                        </Badge>
                        <span className="font-medium text-sm">{step.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Tips Section */}
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
              <Lightbulb className="h-4 w-4 text-orange-500" />
              Tips for the Best Fit
            </h3>
            <ul className="space-y-2">
              {TIPS.map((tip, index) => (
                <li key={`tip-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
