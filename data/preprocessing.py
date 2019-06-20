import csv
inputFile = input("Input File Name: ")
outputFile = "processed_" + inputFile
with open(inputFile, 'r') as i, open(outputFile, 'w') as o:
   r = csv.reader(i, delimiter=',')
   w = csv.writer(o, delimiter=',')
   for row in r:
      if row[4] == '2014':
          w.writerow(row)
